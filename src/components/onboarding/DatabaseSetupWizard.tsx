"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Database,
  Cloud,
  HardDrive,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Zap,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "stacklume-db-setup-completed";
const LOCAL_MODE_KEY = "stacklume-local-mode";

type SetupStep = "welcome" | "choice" | "neon-guide" | "connection" | "success";

interface DatabaseSetupWizardProps {
  onComplete?: (mode: "cloud" | "local") => void;
  forceShow?: boolean;
}

export function DatabaseSetupWizard({
  onComplete,
  forceShow = false,
}: DatabaseSetupWizardProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState<SetupStep>("welcome");
  const [connectionString, setConnectionString] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [hasExistingDb, setHasExistingDb] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  // Check if setup should be shown
  useEffect(() => {
    setMounted(true);

    if (forceShow) {
      setIsVisible(true);
      return;
    }

    // Check if already completed
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) return;

    // Check if database is already configured
    const checkDatabase = async () => {
      try {
        const response = await fetch("/api/database");
        const data = await response.json();

        if (data.config?.hasConnection && data.status === "connected") {
          // Database already configured, mark as complete
          localStorage.setItem(STORAGE_KEY, "cloud");
          setHasExistingDb(true);
        } else {
          // No database, show wizard
          setHasExistingDb(false);
          setTimeout(() => setIsVisible(true), 500);
        }
      } catch {
        // Error checking, assume no database
        setHasExistingDb(false);
        setTimeout(() => setIsVisible(true), 500);
      }
    };

    checkDatabase();
  }, [forceShow]);

  const handleCopyExample = useCallback(() => {
    navigator.clipboard.writeText(
      "postgresql://user:password@ep-xxx.region.neon.tech/neondb?sslmode=require"
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!connectionString.trim()) {
      setErrorMessage("Por favor ingresa una cadena de conexion");
      setConnectionStatus("error");
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus("idle");
    setErrorMessage("");

    try {
      const response = await fetch("/api/database/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString: connectionString.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setConnectionStatus("success");
        setTimeout(() => {
          setCurrentStep("success");
        }, 1000);
      } else {
        setConnectionStatus("error");
        setErrorMessage(
          data.error || "No se pudo conectar a la base de datos"
        );
      }
    } catch {
      setConnectionStatus("error");
      setErrorMessage("Error al verificar la conexion");
    } finally {
      setIsTestingConnection(false);
    }
  }, [connectionString]);

  const handleComplete = useCallback(
    (mode: "cloud" | "local") => {
      localStorage.setItem(STORAGE_KEY, mode);
      if (mode === "local") {
        localStorage.setItem(LOCAL_MODE_KEY, "true");
      }
      setIsVisible(false);
      onComplete?.(mode);
    },
    [onComplete]
  );

  const handleSkipToLocal = useCallback(() => {
    handleComplete("local");
  }, [handleComplete]);

  if (!mounted || !isVisible || hasExistingDb === true) return null;

  const steps: Record<SetupStep, React.ReactNode> = {
    welcome: (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Database className="w-10 h-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Configura tu Base de Datos</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Stacklume puede guardar tus datos en la nube para acceder desde
            cualquier dispositivo, o localmente en tu navegador.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="p-4 rounded-xl border bg-card/50 text-left space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Cloud className="w-5 h-5" />
              <span className="font-semibold">Base de Datos en la Nube</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Sincroniza entre dispositivos
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Backups automaticos
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Gratis con Neon
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border bg-card/50 text-left space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HardDrive className="w-5 h-5" />
              <span className="font-semibold">Solo en este Navegador</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-orange-500" />
                Datos solo en este navegador
              </li>
              <li className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-orange-500" />
                Se pierden al limpiar cache
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Funciona sin configuracion
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleSkipToLocal}
          >
            <HardDrive className="w-4 h-4 mr-2" />
            Continuar sin Base de Datos
          </Button>
          <Button className="flex-1" onClick={() => setCurrentStep("choice")}>
            <Cloud className="w-4 h-4 mr-2" />
            Configurar Base de Datos
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    ),

    choice: (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Elige como conectar</h2>
          <p className="text-muted-foreground">
            Recomendamos Neon por su plan gratuito generoso y facil
            configuracion.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setCurrentStep("neon-guide")}
            className="w-full p-4 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">Neon PostgreSQL</span>
                  <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 text-xs font-medium">
                    Recomendado
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Base de datos serverless gratuita. 512MB storage, sin limite
                  de tiempo.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="w-3 h-3" /> Rapido
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="w-3 h-3" /> Seguro
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe className="w-3 h-3" /> Global
                  </span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>

          <button
            onClick={() => setCurrentStep("connection")}
            className="w-full p-4 rounded-xl border hover:bg-accent/50 transition-colors text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold">Ya tengo una Base de Datos</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Conecta tu propia base de datos PostgreSQL existente.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep("welcome")}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Atras
          </Button>
        </div>
      </div>
    ),

    "neon-guide": (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Crear Base de Datos en Neon</h2>
          <p className="text-muted-foreground">
            Sigue estos 3 simples pasos para configurar tu base de datos gratis.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4 items-start p-4 rounded-xl bg-accent/30">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-medium">Crea una cuenta gratis en Neon</p>
              <p className="text-sm text-muted-foreground mt-1">
                Puedes usar tu cuenta de GitHub, Google, o email.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  window.open("https://console.neon.tech/signup", "_blank")
                }
              >
                Ir a Neon
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </div>
          </div>

          <div className="flex gap-4 items-start p-4 rounded-xl bg-accent/30">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-medium">Crea un nuevo proyecto</p>
              <p className="text-sm text-muted-foreground mt-1">
                Dale un nombre (ej: &quot;stacklume&quot;) y selecciona la region mas
                cercana.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start p-4 rounded-xl bg-accent/30">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-medium">Copia la cadena de conexion</p>
              <p className="text-sm text-muted-foreground mt-1">
                En el dashboard, busca &quot;Connection string&quot; y copia la URL
                completa.
              </p>
              <div className="mt-2 p-2 rounded-lg bg-muted/50 font-mono text-xs break-all">
                postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep("choice")}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Atras
          </Button>
          <Button onClick={() => setCurrentStep("connection")} className="flex-1">
            Ya tengo mi conexion
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    ),

    connection: (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Conecta tu Base de Datos</h2>
          <p className="text-muted-foreground">
            Pega tu cadena de conexion PostgreSQL para verificar la conexion.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Cadena de Conexion (DATABASE_URL)
            </label>
            <div className="relative">
              <Input
                type="password"
                placeholder="postgresql://user:password@host/database"
                value={connectionString}
                onChange={(e) => {
                  setConnectionString(e.target.value);
                  setConnectionStatus("idle");
                  setErrorMessage("");
                }}
                className={cn(
                  "pr-10 font-mono text-sm",
                  connectionStatus === "success" && "border-green-500",
                  connectionStatus === "error" && "border-red-500"
                )}
              />
              {connectionStatus === "success" && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
              {connectionStatus === "error" && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
              )}
            </div>
            {errorMessage && (
              <p className="text-sm text-red-500 mt-2">{errorMessage}</p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Ejemplo de formato:
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={handleCopyExample}
              >
                <Copy className="w-3 h-3 mr-1" />
                {copied ? "Copiado!" : "Copiar"}
              </Button>
            </div>
            <code className="text-xs text-muted-foreground block break-all">
              postgresql://user:password@ep-xxx.region.neon.tech/neondb?sslmode=require
            </code>
          </div>

          <Button
            className="w-full"
            onClick={handleTestConnection}
            disabled={isTestingConnection || !connectionString.trim()}
          >
            {isTestingConnection ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando conexion...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Verificar y Guardar
              </>
            )}
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep("neon-guide")}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Atras
          </Button>
          <Button
            variant="outline"
            onClick={handleSkipToLocal}
            className="flex-1"
          >
            Continuar sin DB
          </Button>
        </div>
      </div>
    ),

    success: (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Conexion Exitosa!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Tu base de datos esta configurada correctamente. Tus datos se
            sincronizaran automaticamente.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Cloud className="w-5 h-5" />
            <span className="font-medium">Base de datos conectada</span>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={() => handleComplete("cloud")}
        >
          Comenzar a usar Stacklume
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    ),
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-full max-w-lg bg-card border rounded-2xl shadow-2xl p-6 md:p-8"
        >
          {steps[currentStep]}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// Hook for programmatic control
export function useDatabaseSetup() {
  const isSetupComplete = useCallback(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(STORAGE_KEY);
  }, []);

  const isLocalMode = useCallback(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LOCAL_MODE_KEY) === "true";
  }, []);

  const resetSetup = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LOCAL_MODE_KEY);
  }, []);

  return {
    isSetupComplete,
    isLocalMode,
    resetSetup,
  };
}

export { STORAGE_KEY as DB_SETUP_STORAGE_KEY, LOCAL_MODE_KEY };
