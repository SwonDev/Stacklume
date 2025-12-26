"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Trash2,
  Download,
  Clock,
  Settings,
  Copy,
  Check,
  AlertCircle,
  Globe,
  Square,
  Volume2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget, VoiceNote } from "@/types/widget";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceNotesWidgetProps {
  widget: Widget;
}

// Supported languages for speech recognition
const SUPPORTED_LANGUAGES = [
  { code: "es-ES", label: "Espanol (Espana)" },
  { code: "es-MX", label: "Espanol (Mexico)" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "fr-FR", label: "Francais" },
  { code: "de-DE", label: "Deutsch" },
  { code: "it-IT", label: "Italiano" },
  { code: "pt-BR", label: "Portugues (Brasil)" },
  { code: "ja-JP", label: "Japanese" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "ko-KR", label: "Korean" },
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "ahora mismo";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  return `hace ${diffDays}d`;
}

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function VoiceNotesWidget({ widget }: VoiceNotesWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = widget.config || {};

  const voiceNotes = (config.voiceNotes as VoiceNote[]) || [];
  const language = (config.voiceLanguage as string) || "es-ES";
  const continuousMode = config.voiceContinuousMode ?? true;
  const showTranscript = config.voiceShowTranscript ?? true;

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSupported, setIsSupported] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unknown">("prompt");
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [hasAttemptedPermission, setHasAttemptedPermission] = useState(false);

  // Playback state
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check browser support and permissions
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    // Check microphone permission status
    const checkPermission = async () => {
      try {
        // Try to query permission status (not supported in all browsers)
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: "microphone" as PermissionName });

          // Only set to "granted" automatically - for "denied" we need to verify by actually requesting
          // Some browsers report "denied" by default in private mode even if never asked
          if (result.state === "granted") {
            setPermissionState("granted");
          } else {
            // Keep as "prompt" - we'll try to request when user clicks
            setPermissionState("prompt");
          }

          // Listen for permission changes
          result.addEventListener("change", () => {
            if (result.state === "granted") {
              setPermissionState("granted");
              setHasAttemptedPermission(true);
            } else if (result.state === "denied" && hasAttemptedPermission) {
              setPermissionState("denied");
            }
          });
        }
      } catch {
        // Permission query not supported - keep as prompt
        setPermissionState("prompt");
      }
    };

    checkPermission();
  }, [hasAttemptedPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Request microphone permission explicitly
  const requestMicrophonePermission = useCallback(async () => {
    setIsRequestingPermission(true);
    setHasAttemptedPermission(true);

    try {
      // First check if any audio input devices exist
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === "audioinput");

      if (audioInputs.length === 0) {
        toast.error("No se detectó ningún micrófono. Conecta un micrófono e intenta de nuevo.", { duration: 6000 });
        setIsRequestingPermission(false);
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission granted, stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
      setPermissionState("granted");
      toast.success("¡Permiso concedido! Ya puedes grabar.");
      return true;
    } catch (error) {
      const err = error as Error;
      console.error("Permission error:", err.name, err.message);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionState("denied");
        // Don't show toast here - the UI will show detailed instructions
      } else if (err.name === "NotFoundError") {
        toast.error("No se encontró ningún micrófono. Verifica que esté conectado.", { duration: 5000 });
      } else if (err.name === "NotReadableError" || err.name === "AbortError") {
        toast.error("El micrófono está siendo usado por otra aplicación. Ciérrala e intenta de nuevo.", { duration: 5000 });
      } else {
        toast.error("Error: " + err.message, { duration: 5000 });
      }
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    // If permission is denied, show instructions
    if (permissionState === "denied") {
      toast.error("El microfono esta bloqueado. Ve a Configuracion del navegador > Privacidad > Microfono y permite el acceso para este sitio.");
      return;
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      setPermissionState("granted");

      // Initialize Speech Recognition
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = continuousMode;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptPart = result[0].transcript;

          if (result.isFinal) {
            final += transcriptPart + " ";
          } else {
            interim += transcriptPart;
          }
        }

        if (final) {
          setCurrentTranscript(prev => prev + final);
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Permiso de microfono denegado");
        } else if (event.error === "no-speech") {
          // Restart if no speech detected
          if (isRecording && continuousMode) {
            recognition.start();
          }
        }
      };

      recognition.onend = () => {
        // Restart if still recording in continuous mode
        if (isRecording && continuousMode && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {
            // Already started, ignore
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      // Initialize MediaRecorder for audio recording
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second

      // Start timer
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      setIsRecording(true);
      setIsPaused(false);
      setCurrentTranscript("");
      setInterimTranscript("");

      toast.success("Grabacion iniciada");
    } catch (error) {
      console.error("Error starting recording:", error);
      const err = error as Error;
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionState("denied");
        toast.error(
          "Permiso de microfono denegado. Haz clic en el icono del candado en la barra de direcciones y permite el acceso al microfono.",
          { duration: 6000 }
        );
      } else if (err.name === "NotFoundError") {
        toast.error("No se encontro ningun microfono conectado");
      } else if (err.name === "NotReadableError") {
        toast.error("El microfono esta siendo usado por otra aplicacion");
      } else {
        toast.error("Error al iniciar la grabacion: " + err.message);
      }
    }
  }, [language, continuousMode, isRecording, permissionState]);

  const stopRecording = useCallback(async () => {
    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop media recorder and get audio blob
    return new Promise<Blob | null>((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          resolve(audioBlob);
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }

      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    });
  }, []);

  const handleStopAndSave = useCallback(async () => {
    const audioBlob = await stopRecording();

    const finalTranscript = (currentTranscript + " " + interimTranscript).trim();

    if (!finalTranscript && !audioBlob) {
      toast.error("No se detecto ninguna nota");
      setIsRecording(false);
      return;
    }

    // Convert audio blob to base64 for storage
    let audioUrl: string | undefined;
    if (audioBlob && audioBlob.size > 0) {
      audioUrl = URL.createObjectURL(audioBlob);
    }

    // Create new note
    const newNote: VoiceNote = {
      id: `note_${Date.now()}`,
      title: finalTranscript.slice(0, 50) || "Nota de voz",
      transcript: finalTranscript,
      audioUrl,
      duration: recordingDuration,
      createdAt: new Date().toISOString(),
      language,
    };

    // Save to widget config
    const updatedNotes = [newNote, ...voiceNotes];
    await updateWidget(widget.id, {
      config: {
        ...config,
        voiceNotes: updatedNotes,
      } as Record<string, unknown>,
    });

    setIsRecording(false);
    setCurrentTranscript("");
    setInterimTranscript("");
    setRecordingDuration(0);

    toast.success("Nota guardada");
  }, [stopRecording, currentTranscript, interimTranscript, recordingDuration, language, voiceNotes, updateWidget, widget.id, config]);

  const handleDeleteNote = async (noteId: string) => {
    const updatedNotes = voiceNotes.filter(note => note.id !== noteId);
    await updateWidget(widget.id, {
      config: {
        ...config,
        voiceNotes: updatedNotes,
      } as Record<string, unknown>,
    });
    toast.success("Nota eliminada");
  };

  const handleCopyTranscript = async (note: VoiceNote) => {
    try {
      await navigator.clipboard.writeText(note.transcript);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Texto copiado");
    } catch {
      toast.error("Error al copiar");
    }
  };

  const handlePlayAudio = (note: VoiceNote) => {
    if (!note.audioUrl) return;

    if (playingId === note.id) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
    } else {
      // Stop previous
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Play new
      const audio = new Audio(note.audioUrl);
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(note.id);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    await updateWidget(widget.id, {
      config: {
        ...config,
        voiceLanguage: newLanguage,
      } as Record<string, unknown>,
    });
  };

  const handleUpdateTitle = async (noteId: string, newTitle: string) => {
    const updatedNotes = voiceNotes.map(note =>
      note.id === noteId ? { ...note, title: newTitle } : note
    );
    await updateWidget(widget.id, {
      config: {
        ...config,
        voiceNotes: updatedNotes,
      } as Record<string, unknown>,
    });
    setEditingTitle(null);
  };

  // Not supported state
  if (!isSupported) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Mic className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{widget.title}</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No soportado</h3>
          <p className="text-sm text-muted-foreground">
            Tu navegador no soporta reconocimiento de voz.
            Usa Chrome, Edge o Safari para esta funcionalidad.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{widget.title}</span>
          <Badge variant="secondary" className="text-xs">
            {voiceNotes.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="h-7 w-[110px] text-xs">
              <Globe className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Recording area */}
      <div className="mb-4">
        {isRecording ? (
          <div className="p-4 rounded-lg border border-red-500/50 bg-red-500/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-red-500">Grabando</span>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStopAndSave}
                className="gap-1.5"
              >
                <Square className="w-3 h-3 fill-current" />
                Detener
              </Button>
            </div>

            {showTranscript && (
              <div className="text-sm min-h-[60px] p-2 rounded bg-background/50">
                <span>{currentTranscript}</span>
                <span className="text-muted-foreground">{interimTranscript}</span>
                {!currentTranscript && !interimTranscript && (
                  <span className="text-muted-foreground italic">
                    Empieza a hablar...
                  </span>
                )}
              </div>
            )}
          </div>
        ) : permissionState === "denied" && hasAttemptedPermission ? (
          <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
            <div className="flex items-start gap-3">
              <MicOff className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-2">
                  Micrófono bloqueado
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  El navegador bloqueó el acceso sin mostrar el diálogo. Prueba:
                </p>
                <div className="text-xs text-muted-foreground space-y-2 mb-3">
                  <p><strong>1. Verifica Windows:</strong> Configuración → Privacidad → Micrófono → Activar</p>
                  <p><strong>2. Permisos de Edge:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li>Clic en el candado 🔒 junto a la URL</li>
                    <li>Permisos del sitio → Micrófono → Permitir</li>
                  </ul>
                  <p><strong>3. O abre:</strong>{" "}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("edge://settings/content/microphone");
                        toast.success("URL copiada. Pégala en una nueva pestaña.");
                      }}
                      className="text-primary underline hover:no-underline"
                    >
                      edge://settings/content/microphone
                    </button>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Recargar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setPermissionState("prompt");
                      setHasAttemptedPermission(false);
                    }}
                    className="gap-1.5"
                  >
                    Reintentar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : permissionState === "granted" ? (
          <Button
            onClick={startRecording}
            className="w-full gap-2"
            variant="outline"
          >
            <Mic className="w-4 h-4" />
            Nueva nota de voz
          </Button>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={requestMicrophonePermission}
              className="w-full gap-2"
              variant="default"
              disabled={isRequestingPermission}
            >
              {isRequestingPermission ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              {isRequestingPermission ? "Solicitando permiso..." : "Permitir acceso al microfono"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              El navegador te pedira permiso para usar el microfono
            </p>
          </div>
        )}
      </div>

      {/* Notes list */}
      {voiceNotes.length > 0 ? (
        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-2">
            {voiceNotes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  {editingTitle === note.id ? (
                    <Input
                      defaultValue={note.title}
                      className="h-7 text-sm"
                      autoFocus
                      onBlur={(e) => handleUpdateTitle(note.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateTitle(note.id, e.currentTarget.value);
                        } else if (e.key === "Escape") {
                          setEditingTitle(null);
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="font-medium text-sm truncate cursor-pointer hover:text-primary"
                      onClick={() => setEditingTitle(note.id)}
                      title="Click para editar"
                    >
                      {note.title}
                    </span>
                  )}

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {note.audioUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handlePlayAudio(note)}
                      >
                        {playingId === note.id ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopyTranscript(note)}
                    >
                      {copiedId === note.id ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {note.transcript || "Sin transcripcion"}
                </p>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(note.duration)}
                  </span>
                  <span>{formatRelativeTime(note.createdAt)}</span>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {SUPPORTED_LANGUAGES.find(l => l.code === note.language)?.label.split(" ")[0] || note.language}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <Volume2 className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No hay notas de voz. Pulsa el boton para empezar a grabar.
          </p>
        </div>
      )}
    </div>
  );
}
