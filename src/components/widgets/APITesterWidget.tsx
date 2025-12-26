"use client";

import { useState, useCallback } from "react";
import {
  Terminal,
  Play,
  Copy,
  Loader2,
  ChevronDown,
  Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface APITesterWidgetProps {
  widget: Widget;
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface LastRequest {
  method: HttpMethod;
  url: string;
  headers: string;
  body: string;
}

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-green-500/20 text-green-600 border-green-500/30",
  POST: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  PUT: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  DELETE: "bg-red-500/20 text-red-600 border-red-500/30",
  PATCH: "bg-purple-500/20 text-purple-600 border-purple-500/30",
};

export function APITesterWidget({ widget }: APITesterWidgetProps) {
  const lastRequest = (widget.config?.lastRequest as LastRequest) || {
    method: "GET",
    url: "",
    headers: "{}",
    body: "",
  };

  const [method, setMethod] = useState<HttpMethod>(lastRequest.method);
  const [url, setUrl] = useState(lastRequest.url);
  const [headers, setHeaders] = useState(lastRequest.headers);
  const [body, setBody] = useState(lastRequest.body);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);
  const [showBody, setShowBody] = useState(false);

  const saveRequest = useCallback(
    (request: LastRequest) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          lastRequest: request,
        },
      });
    },
    [widget.id, widget.config]
  );

  const executeRequest = async () => {
    if (!url.trim()) {
      toast.error("Ingresa una URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    const startTime = Date.now();

    try {
      // Parse headers
      let parsedHeaders: Record<string, string> = {};
      if (headers.trim()) {
        try {
          parsedHeaders = JSON.parse(headers);
        } catch {
          throw new Error("Headers JSON invalido");
        }
      }

      // Build request options
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...parsedHeaders,
        },
      };

      // Add body for methods that support it
      if (["POST", "PUT", "PATCH"].includes(method) && body.trim()) {
        options.body = body;
      }

      // Execute request
      const res = await fetch(url, options);
      const endTime = Date.now();

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Get response body
      let responseBody = "";
      const contentType = res.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const json = await res.json();
        responseBody = JSON.stringify(json, null, 2);
      } else {
        responseBody = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
        time: endTime - startTime,
      });

      // Save successful request
      saveRequest({ method, url, headers, body });
      toast.success(`${method} ${res.status} - ${endTime - startTime}ms`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = async () => {
    if (!response?.body) return;
    try {
      await navigator.clipboard.writeText(response.body);
      toast.success("Respuesta copiada");
    } catch {
      toast.error("Error al copiar");
    }
  };

  const clearAll = () => {
    setUrl("");
    setHeaders("{}");
    setBody("");
    setResponse(null);
    setError(null);
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-500";
    if (status >= 300 && status < 400) return "text-yellow-500";
    if (status >= 400 && status < 500) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4 gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">API Tester</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={clearAll}
            title="Limpiar"
          >
            <Eraser className="w-4 h-4" />
          </Button>
        </div>

        {/* Method and URL */}
        <div className="flex gap-2">
          <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["GET", "POST", "PUT", "PATCH", "DELETE"] as HttpMethod[]).map((m) => (
                <SelectItem key={m} value={m}>
                  <Badge variant="outline" className={cn("font-mono text-xs", METHOD_COLORS[m])}>
                    {m}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && executeRequest()}
            placeholder="https://api.example.com/endpoint"
            className="h-8 text-sm flex-1 font-mono"
          />
          <Button
            size="sm"
            className="h-8"
            onClick={executeRequest}
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Headers section */}
        <Collapsible open={showHeaders} onOpenChange={setShowHeaders}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-7 px-2">
              <span className="text-xs">Headers (JSON)</span>
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform",
                  showHeaders && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              placeholder='{"Authorization": "Bearer token"}'
              className="mt-1 h-16 text-xs font-mono resize-none"
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Body section (for POST, PUT, PATCH) */}
        {["POST", "PUT", "PATCH"].includes(method) && (
          <Collapsible open={showBody} onOpenChange={setShowBody}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-7 px-2">
                <span className="text-xs">Body (JSON)</span>
                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform",
                    showBody && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"key": "value"}'
                className="mt-1 h-20 text-xs font-mono resize-none"
              />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Response section */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-muted-foreground">Respuesta</Label>
            {response && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{response.time}ms</span>
                <Badge
                  variant="outline"
                  className={cn("text-xs font-mono", getStatusColor(response.status))}
                >
                  {response.status} {response.statusText}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={copyResponse}
                  title="Copiar"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 rounded-md border bg-muted/30 overflow-hidden">
            {error ? (
              <div className="h-full flex items-center justify-center p-4 text-center">
                <div className="text-destructive text-xs">{error}</div>
              </div>
            ) : response ? (
              <ScrollArea className="h-full">
                <pre className="p-3 font-mono text-xs whitespace-pre-wrap break-all">
                  {response.body || "(empty response)"}
                </pre>
              </ScrollArea>
            ) : (
              <div className="h-full flex items-center justify-center p-4 text-center">
                <div className="text-muted-foreground text-xs">
                  La respuesta aparecera aqui
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
