"use client";

import { useState } from "react";
import { Copy, CheckCircle2, ExternalLink, Terminal, Monitor, Code2, Cpu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface McpDocsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mcpUrl: string;
  mcpApiKey: string | null;
}

// ─── Bloque de código con botón copiar ────────────────────────────────────────

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {label && (
        <p className="text-[11px] text-muted-foreground mb-1 font-mono uppercase tracking-wide">{label}</p>
      )}
      <pre className="bg-muted/60 border border-border/50 rounded-lg px-3 py-3 text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-6 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border/50 hover:bg-secondary"
        aria-label="Copiar"
      >
        {copied
          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        }
      </button>
    </div>
  );
}

// ─── Chip de plataforma ───────────────────────────────────────────────────────

function PlatformBadge({ label }: { label: string }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
      {label}
    </span>
  );
}

// ─── Ruta de archivo ──────────────────────────────────────────────────────────

function FilePath({ path, label }: { path: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(path);
        setCopied(true);
        toast.success("Ruta copiada");
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors group"
      title={`Copiar: ${path}`}
    >
      <span className="text-muted-foreground/60 not-italic">{label}:</span>
      <span className="truncate max-w-[280px]">{path}</span>
      {copied
        ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
        : <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
      }
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function McpDocsDialog({ open, onOpenChange, mcpUrl, mcpApiKey }: McpDocsDialogProps) {
  const key = mcpApiKey ?? "<TU_API_KEY>";
  const bearerHeader = `Authorization: Bearer ${key}`;

  // Configs por herramienta
  const claudeDesktopConfig = JSON.stringify(
    { mcpServers: { stacklume: { url: mcpUrl, headers: { Authorization: `Bearer ${key}` } } } },
    null, 2
  );

  const claudeCodeConfig = JSON.stringify(
    { mcpServers: { stacklume: { url: mcpUrl, headers: { Authorization: `Bearer ${key}` } } } },
    null, 2
  );

  const claudeCodeCmd = `claude mcp add --transport http stacklume "${mcpUrl}" \\\n  --header "Authorization: Bearer ${key}"`;

  const cursorConfig = JSON.stringify(
    { mcpServers: { stacklume: { url: mcpUrl, transport: "http", headers: { Authorization: `Bearer ${key}` } } } },
    null, 2
  );

  const windsurf = JSON.stringify(
    { mcpServers: { stacklume: { serverUrl: mcpUrl, headers: { Authorization: `Bearer ${key}` } } } },
    null, 2
  );

  const clineVscodeSettings = JSON.stringify(
    { "mcp.servers": { stacklume: { url: mcpUrl, headers: { Authorization: `Bearer ${key}` } } } },
    null, 2
  );

  const continueDev = JSON.stringify(
    {
      mcpServers: [
        {
          name: "stacklume",
          transport: { type: "http", url: mcpUrl, headers: { Authorization: `Bearer ${key}` } }
        }
      ]
    },
    null, 2
  );

  const genericFetch = `# Llamada de prueba — tools/list
curl -X POST "${mcpUrl}" \\
  -H "Content-Type: application/json" \\
  -H "${bearerHeader}" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Llamada de prueba — get_app_info
curl -X POST "${mcpUrl}" \\
  -H "Content-Type: application/json" \\
  -H "${bearerHeader}" \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_app_info","arguments":{}}}'`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <div className="px-6 pt-6 pb-4 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              Conectar servidor MCP de Stacklume
            </DialogTitle>
            <DialogDescription>
              Instrucciones de configuración para cada herramienta compatible con MCP.
              {!mcpApiKey && (
                <span className="block mt-1 text-amber-500 text-xs">
                  ⚠️ Genera una API key en Configuración antes de usar estas instrucciones.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs defaultValue="claude-desktop" className="flex flex-col flex-1 min-h-0">
          {/* Barra de pestañas con scroll horizontal y sin wrap */}
          <div className="px-6 pb-3 shrink-0 overflow-x-auto scrollbar-none">
            <TabsList className="flex flex-nowrap h-auto gap-1 bg-transparent p-0 w-max">
              {[
                { value: "claude-desktop", label: "Claude Desktop" },
                { value: "claude-code",    label: "Claude Code" },
                { value: "cursor",         label: "Cursor" },
                { value: "windsurf",       label: "Windsurf" },
                { value: "vscode-cline",   label: "VS Code / Cline" },
                { value: "continue",       label: "Continue.dev" },
                { value: "generic",        label: "Genérico / curl" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-xs px-2.5 py-1 rounded-md whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Contenido con scroll vertical dorado */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-6 pb-6">

            {/* ── Claude Desktop ─────────────────────────────────────────── */}
            <TabsContent value="claude-desktop" className="space-y-4">
              <div className="flex items-start gap-2">
                <Monitor className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Claude Desktop</p>
                  <p className="text-xs text-muted-foreground">
                    Abre el archivo de configuración de Claude Desktop y añade el bloque
                    <code className="mx-1 px-1 py-0.5 rounded bg-muted text-[11px]">mcpServers</code>
                    (o añade la entrada si ya existe la clave).
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <FilePath label="macOS" path="~/Library/Application Support/Claude/claude_desktop_config.json" />
                <FilePath label="Windows" path="%APPDATA%\Claude\claude_desktop_config.json" />
                <FilePath label="Linux" path="~/.config/claude/claude_desktop_config.json" />
              </div>

              <CodeBlock code={claudeDesktopConfig} label="claude_desktop_config.json" />

              <p className="text-xs text-muted-foreground">
                Reinicia Claude Desktop después de guardar el archivo. Aparecerá el icono de herramientas
                en la barra de conversación cuando el servidor responda correctamente.
              </p>
            </TabsContent>

            {/* ── Claude Code CLI ────────────────────────────────────────── */}
            <TabsContent value="claude-code" className="space-y-4">
              <div className="flex items-start gap-2">
                <Terminal className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Claude Code (CLI)</p>
                  <p className="text-xs text-muted-foreground">
                    Puedes registrar el servidor MCP con el comando CLI <strong>o</strong> creando el archivo
                    <code className="mx-1 px-1 py-0.5 rounded bg-muted text-[11px]">.mcp.json</code>
                    en la raíz del proyecto.
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-1.5">Opción A — Comando CLI (recomendado)</p>
                <CodeBlock code={claudeCodeCmd} label="Terminal" />
              </div>

              <div>
                <p className="text-xs font-medium mb-1.5">
                  Opción B — Archivo <code className="text-[11px]">.mcp.json</code> en la raíz del proyecto
                </p>
                <CodeBlock code={claudeCodeConfig} label=".mcp.json" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium mb-1.5">
                  Opción C — Configuración global <code className="text-[11px]">~/.claude/mcp.json</code>
                </p>
                <FilePath label="Global" path="~/.claude/mcp.json" />
                <CodeBlock code={claudeCodeConfig} label="~/.claude/mcp.json" />
              </div>

              <p className="text-xs text-muted-foreground">
                Con el servidor registrado, Claude Code puede usar herramientas como{" "}
                <code className="px-1 py-0.5 rounded bg-muted text-[11px]">mcp__stacklume__add_widget</code>{" "}
                directamente en sus respuestas.
              </p>
            </TabsContent>

            {/* ── Cursor ─────────────────────────────────────────────────── */}
            <TabsContent value="cursor" className="space-y-4">
              <div className="flex items-start gap-2">
                <Code2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Cursor</p>
                  <p className="text-xs text-muted-foreground">
                    Dos formas de configurar MCP en Cursor: archivo por proyecto o configuración global.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-medium">Opción A — Archivo de proyecto</p>
                  <FilePath label="" path=".cursor/mcp.json" />
                </div>
                <CodeBlock code={cursorConfig} label=".cursor/mcp.json" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-medium">Opción B — Configuración global</p>
                  <FilePath label="" path="~/.cursor/mcp.json" />
                </div>
                <CodeBlock code={cursorConfig} label="~/.cursor/mcp.json" />
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium">Alternativa visual (Cursor Settings)</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Abre <strong>Cursor → Settings → MCP</strong></li>
                  <li>Pulsa <strong>Add Server</strong></li>
                  <li>Tipo: <code className="px-1 py-0.5 rounded bg-muted text-[11px]">Streamable HTTP</code></li>
                  <li>URL: <code className="px-1 py-0.5 rounded bg-muted text-[11px] break-all">{mcpUrl}</code></li>
                  <li>Header: <code className="px-1 py-0.5 rounded bg-muted text-[11px]">Authorization: Bearer {key}</code></li>
                </ol>
              </div>
            </TabsContent>

            {/* ── Windsurf ───────────────────────────────────────────────── */}
            <TabsContent value="windsurf" className="space-y-4">
              <div className="flex items-start gap-2">
                <Code2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Windsurf (Codeium)</p>
                  <p className="text-xs text-muted-foreground">
                    Windsurf usa el archivo <code className="mx-1 px-1 py-0.5 rounded bg-muted text-[11px]">mcp_config.json</code>{" "}
                    en su directorio de configuración global.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <FilePath label="macOS / Linux" path="~/.codeium/windsurf/mcp_config.json" />
                <FilePath label="Windows" path="%USERPROFILE%\.codeium\windsurf\mcp_config.json" />
              </div>

              <CodeBlock code={windsurf} label="mcp_config.json" />

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium">Alternativa visual (Windsurf Settings)</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Abre <strong>Windsurf → Settings → Cascade → MCP Servers</strong></li>
                  <li>Pulsa el ícono de editar para abrir <code className="px-1 py-0.5 rounded bg-muted text-[11px]">mcp_config.json</code></li>
                  <li>Pega la configuración de arriba y guarda</li>
                  <li>Reinicia Windsurf para que Cascade detecte el servidor</li>
                </ol>
              </div>
            </TabsContent>

            {/* ── VS Code / Cline ────────────────────────────────────────── */}
            <TabsContent value="vscode-cline" className="space-y-4">
              <div className="flex items-start gap-2">
                <Code2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">VS Code — Cline / RooCode</p>
                  <p className="text-xs text-muted-foreground">
                    Cline (antes Claude Dev) y RooCode soportan MCP. Configura desde el panel lateral
                    de la extensión o via <code className="mx-1 px-1 py-0.5 rounded bg-muted text-[11px]">settings.json</code>.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium">Vía panel de Cline (recomendado)</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Abre el panel lateral de <strong>Cline</strong> en VS Code</li>
                  <li>Pulsa el ícono <strong>MCP Servers</strong> (enchufe) en la barra superior</li>
                  <li>Selecciona <strong>Remote Server</strong></li>
                  <li>
                    Introduce la URL:{" "}
                    <code className="px-1 py-0.5 rounded bg-muted text-[11px] break-all">{mcpUrl}</code>
                  </li>
                  <li>En el archivo <code className="px-1 py-0.5 rounded bg-muted text-[11px]">cline_mcp_settings.json</code> que se abre, añade el header</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-medium">Archivo de configuración de Cline</p>
                  <PlatformBadge label="macOS" />
                </div>
                <FilePath label="macOS" path="~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json" />
                <FilePath label="Windows" path="%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json" />
              </div>

              <CodeBlock code={clineVscodeSettings} label="cline_mcp_settings.json (fragmento)" />

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium">VS Code nativo (v1.99+ con soporte MCP experimental)</p>
                <p className="text-xs text-muted-foreground">
                  VS Code 1.99+ incluye soporte MCP experimental. Añade en{" "}
                  <code className="px-1 py-0.5 rounded bg-muted text-[11px]">.vscode/mcp.json</code>{" "}
                  del workspace o en la configuración de usuario:
                </p>
                <FilePath label="Workspace" path=".vscode/mcp.json" />
                <CodeBlock
                  code={JSON.stringify(
                    { servers: { stacklume: { type: "http", url: mcpUrl, headers: { Authorization: `Bearer ${key}` } } } },
                    null, 2
                  )}
                  label=".vscode/mcp.json"
                />
              </div>
            </TabsContent>

            {/* ── Continue.dev ───────────────────────────────────────────── */}
            <TabsContent value="continue" className="space-y-4">
              <div className="flex items-start gap-2">
                <Code2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Continue.dev</p>
                  <p className="text-xs text-muted-foreground">
                    Extensión de VS Code / JetBrains para asistencia de código con soporte MCP.
                    Edita el archivo <code className="mx-1 px-1 py-0.5 rounded bg-muted text-[11px]">config.json</code>{" "}
                    de Continue.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <FilePath label="macOS / Linux" path="~/.continue/config.json" />
                <FilePath label="Windows" path="%USERPROFILE%\.continue\config.json" />
              </div>

              <CodeBlock code={continueDev} label="config.json (fragmento — sección mcpServers)" />

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium">Alternativa visual</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Abre el panel de Continue en VS Code</li>
                  <li>Ve a <strong>Settings → MCP</strong></li>
                  <li>Pulsa <strong>Add MCP Server</strong> y elige tipo <strong>HTTP</strong></li>
                  <li>Rellena la URL y el header de autorización</li>
                </ol>
              </div>
            </TabsContent>

            {/* ── Genérico / curl ────────────────────────────────────────── */}
            <TabsContent value="generic" className="space-y-4">
              <div className="flex items-start gap-2">
                <Terminal className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Cualquier cliente MCP / curl</p>
                  <p className="text-xs text-muted-foreground">
                    El servidor implementa <strong>Streamable HTTP (MCP 2024-11-05)</strong> sobre
                    JSON-RPC 2.0. Compatible con cualquier cliente que soporte este transporte.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium">Detalles del endpoint</p>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-border/30">
                    {[
                      ["URL", mcpUrl],
                      ["Método", "POST"],
                      ["Content-Type", "application/json"],
                      ["Auth", `Bearer ${key}`],
                      ["Protocolo", "MCP 2024-11-05 / JSON-RPC 2.0"],
                    ].map(([label, value]) => (
                      <tr key={label} className="py-1">
                        <td className="pr-3 font-medium text-muted-foreground w-28 py-1">{label}</td>
                        <td className="font-mono text-[11px] break-all py-1">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <CodeBlock code={genericFetch} label="Ejemplos curl" />

              <div>
                <p className="text-xs font-medium mb-1.5">Config genérica (cualquier cliente MCP HTTP)</p>
                <CodeBlock
                  code={JSON.stringify(
                    {
                      mcpServers: {
                        stacklume: {
                          url: mcpUrl,
                          transport: "streamable-http",
                          headers: { Authorization: `Bearer ${key}` },
                        }
                      }
                    },
                    null, 2
                  )}
                  label="config genérica"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Especificación completa:{" "}
                  <a
                    href="https://spec.modelcontextprotocol.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    spec.modelcontextprotocol.io
                  </a>
                </span>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
