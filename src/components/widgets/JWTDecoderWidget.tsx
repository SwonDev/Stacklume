"use client";

import { useState, useCallback, useEffect } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Key, Copy, Check, AlertCircle, Clock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface JWTDecoderWidgetProps {
  widget: Widget;
}

interface JWTHeader {
  alg?: string;
  typ?: string;
  [key: string]: unknown;
}

interface JWTPayload {
  exp?: number;
  iat?: number;
  nbf?: number;
  [key: string]: unknown;
}

interface DecodedJWT {
  header: JWTHeader;
  payload: JWTPayload;
  signature: string;
  raw: {
    header: string;
    payload: string;
    signature: string;
  };
}

type ExpirationStatus = "valid" | "expired" | "not-yet-valid" | "no-exp";

export function JWTDecoderWidget({ widget }: JWTDecoderWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const [token, setToken] = useState(widget.config?.lastToken || "");
  const [decoded, setDecoded] = useState<DecodedJWT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(widget.config?.showRaw || false);

  // Base64URL decode helper
  const base64UrlDecode = useCallback((str: string): string => {
    try {
      // Replace URL-safe chars with standard Base64 chars
      let base64 = str.replace(/-/g, "+").replace(/_/g, "/");

      // Add padding if needed
      const padding = base64.length % 4;
      if (padding) {
        base64 += "=".repeat(4 - padding);
      }

      // Decode using atob
      const decoded = atob(base64);

      // Convert to UTF-8
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }

      return new TextDecoder().decode(bytes);
    } catch (_err) {
      throw new Error("Invalid Base64URL encoding");
    }
  }, []);

  // Decode JWT token
  const decodeJWT = useCallback((tokenString: string): DecodedJWT => {
    const parts = tokenString.trim().split(".");

    if (parts.length !== 3) {
      throw new Error("Invalid JWT format. Token must have 3 parts separated by dots.");
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    try {
      const headerJson = base64UrlDecode(headerB64);
      const header = JSON.parse(headerJson) as JWTHeader;

      const payloadJson = base64UrlDecode(payloadB64);
      const payload = JSON.parse(payloadJson) as JWTPayload;

      return {
        header,
        payload,
        signature: signatureB64,
        raw: {
          header: headerJson,
          payload: payloadJson,
          signature: signatureB64,
        },
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("Base64URL")) {
        throw err;
      }
      throw new Error("Failed to parse JWT. Invalid JSON in header or payload.");
    }
  }, [base64UrlDecode]);

  // Process token input
  const processToken = useCallback((tokenString: string) => {
    setError(null);
    setDecoded(null);

    if (!tokenString.trim()) {
      return;
    }

    try {
      const result = decodeJWT(tokenString);
      setDecoded(result);

      // Save last token to widget config
      updateWidget(widget.id, {
        config: { lastToken: tokenString, showRaw },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to decode JWT";
      setError(errorMessage);
    }
  }, [decodeJWT, updateWidget, widget.id, showRaw]);

  // Update decoded JWT when token changes
  useEffect(() => {
    const timer = setTimeout(() => {
      processToken(token);
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timer);
  }, [token, processToken]);

  // Get expiration status
  const getExpirationStatus = useCallback((payload: JWTPayload): ExpirationStatus => {
    if (!payload.exp) {
      return "no-exp";
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = payload.exp;
    const nbf = payload.nbf;

    if (nbf && now < nbf) {
      return "not-yet-valid";
    }

    if (now >= exp) {
      return "expired";
    }

    return "valid";
  }, []);

  // Calculate time until expiration
  const getTimeUntilExpiration = useCallback((exp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = exp - now;

    if (diff < 0) {
      const absDiff = Math.abs(diff);
      if (absDiff < 60) return `Expired ${absDiff}s ago`;
      if (absDiff < 3600) return `Expired ${Math.floor(absDiff / 60)}m ago`;
      if (absDiff < 86400) return `Expired ${Math.floor(absDiff / 3600)}h ago`;
      return `Expired ${Math.floor(absDiff / 86400)}d ago`;
    }

    if (diff < 60) return `Expires in ${diff}s`;
    if (diff < 3600) return `Expires in ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Expires in ${Math.floor(diff / 3600)}h`;
    return `Expires in ${Math.floor(diff / 86400)}d`;
  }, []);

  // Format timestamp to readable date
  const formatTimestamp = useCallback((timestamp: number): string => {
    try {
      return new Date(timestamp * 1000).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "Invalid date";
    }
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(section);
      toast.success(`${section} copied to clipboard`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, []);

  // Render JSON with syntax highlighting - regular function for recursion
  const renderJSON = (obj: Record<string, unknown>, indent = 0): React.ReactNode => {
    const entries = Object.entries(obj);

    return (
      <div className="font-mono text-xs @md:text-sm">
        <span className="text-muted-foreground">{"{"}</span>
        {entries.map(([key, value], index) => (
          <div key={key} style={{ paddingLeft: `${(indent + 1) * 16}px` }}>
            <span className="text-blue-400">&quot;{key}&quot;</span>
            <span className="text-muted-foreground">: </span>
            {typeof value === "string" ? (
              <span className="text-green-400">&quot;{value}&quot;</span>
            ) : typeof value === "number" ? (
              <span className="text-yellow-400">{value}</span>
            ) : typeof value === "boolean" ? (
              <span className="text-purple-400">{String(value)}</span>
            ) : value === null ? (
              <span className="text-red-400">null</span>
            ) : typeof value === "object" && !Array.isArray(value) ? (
              renderJSON(value as Record<string, unknown>, indent + 1)
            ) : (
              <span className="text-orange-400">{JSON.stringify(value)}</span>
            )}
            {index < entries.length - 1 && <span className="text-muted-foreground">,</span>}
          </div>
        ))}
        <span className="text-muted-foreground" style={{ paddingLeft: `${indent * 16}px` }}>
          {"}"}
        </span>
      </div>
    );
  };

  // Toggle raw view
  const toggleRawView = useCallback(() => {
    const newShowRaw = !showRaw;
    setShowRaw(newShowRaw);
    updateWidget(widget.id, {
      config: { lastToken: token, showRaw: newShowRaw },
    });
  }, [showRaw, updateWidget, widget.id, token]);

  const expirationStatus = decoded ? getExpirationStatus(decoded.payload) : null;

  return (
    <div className="@container flex h-full w-full flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold">JWT Decoder</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleRawView}
          className="h-7 gap-1.5 text-xs"
          title={showRaw ? "Show formatted view" : "Show raw view"}
        >
          {showRaw ? (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden @sm:inline">Formatted</span>
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              <span className="hidden @sm:inline">Raw</span>
            </>
          )}
        </Button>
      </div>

      {/* Token Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="jwt-input" className="text-xs font-medium">
          JWT Token
        </Label>
        <Textarea
          id="jwt-input"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your JWT token here (eyJhbGciOi...)"
          className="min-h-[60px] resize-none font-mono text-xs @md:text-sm"
        />
      </div>

      {/* Error Display */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 p-3"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
            <p className="text-xs text-red-500">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decoded Output */}
      {decoded && !error && (
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          {/* Expiration Status */}
          {decoded.payload.exp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-between rounded-md border border-border bg-muted/50 p-2"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {getTimeUntilExpiration(decoded.payload.exp)}
                </span>
              </div>
              <Badge
                variant={
                  expirationStatus === "valid"
                    ? "default"
                    : expirationStatus === "expired"
                    ? "destructive"
                    : "secondary"
                }
                className="text-xs"
              >
                {expirationStatus === "valid"
                  ? "Valid"
                  : expirationStatus === "expired"
                  ? "Expired"
                  : expirationStatus === "not-yet-valid"
                  ? "Not Yet Valid"
                  : "No Expiration"}
              </Badge>
            </motion.div>
          )}

          {/* Tabs for Header and Payload */}
          <Tabs defaultValue="header" className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="header" className="text-xs">
                Header
              </TabsTrigger>
              <TabsTrigger value="payload" className="text-xs">
                Payload
              </TabsTrigger>
            </TabsList>

            {/* Header Tab */}
            <TabsContent value="header" className="flex-1 overflow-hidden">
              <div className="flex h-full flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {decoded.header.alg || "Unknown"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {decoded.header.typ || "JWT"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        showRaw ? decoded.raw.header : JSON.stringify(decoded.header, null, 2),
                        "Header"
                      )
                    }
                    className="h-6 gap-1 px-2 text-xs"
                  >
                    {copied === "Header" ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span className="hidden @sm:inline">Copy</span>
                  </Button>
                </div>
                <ScrollArea className="flex-1 rounded-md border border-border bg-muted/30 p-3">
                  {showRaw ? (
                    <pre className="font-mono text-xs @md:text-sm">{decoded.raw.header}</pre>
                  ) : (
                    renderJSON(decoded.header)
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Payload Tab */}
            <TabsContent value="payload" className="flex-1 overflow-hidden">
              <div className="flex h-full flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-1">
                    {decoded.payload.iat && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Issued:</span>{" "}
                        {formatTimestamp(decoded.payload.iat)}
                      </div>
                    )}
                    {decoded.payload.exp && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Expires:</span>{" "}
                        {formatTimestamp(decoded.payload.exp)}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        showRaw ? decoded.raw.payload : JSON.stringify(decoded.payload, null, 2),
                        "Payload"
                      )
                    }
                    className="h-6 gap-1 px-2 text-xs"
                  >
                    {copied === "Payload" ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span className="hidden @sm:inline">Copy</span>
                  </Button>
                </div>
                <ScrollArea className="flex-1 rounded-md border border-border bg-muted/30 p-3">
                  {showRaw ? (
                    <pre className="font-mono text-xs @md:text-sm">{decoded.raw.payload}</pre>
                  ) : (
                    renderJSON(decoded.payload)
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>

          {/* Signature Section */}
          <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">Signature</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(decoded.signature, "Signature")}
                className="h-5 gap-1 px-1.5 text-xs"
              >
                {copied === "Signature" ? (
                  <Check className="h-2.5 w-2.5 text-green-500" />
                ) : (
                  <Copy className="h-2.5 w-2.5" />
                )}
              </Button>
            </div>
            <div className="break-all font-mono text-[10px] text-muted-foreground @md:text-xs">
              {decoded.signature}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!decoded && !error && !token && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Key className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Paste a JWT token above to decode it
          </p>
        </div>
      )}
    </div>
  );
}
