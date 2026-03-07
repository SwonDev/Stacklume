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
import { useTranslation } from "@/lib/i18n";

interface McpDocsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mcpUrl: string;
  mcpApiKey: string | null;
}

// ─── Bloque de código con botón copiar ────────────────────────────────────────

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(t("mcpDocs.copied"));
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
        aria-label={t("mcpDocs.copy")}
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
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(path);
        setCopied(true);
        toast.success(t("mcpDocs.pathCopied"));
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
  const { t } = useTranslation();
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
              {t("mcpDocs.title")}
            </DialogTitle>
            <DialogDescription>
              {t("mcpDocs.description")}
              {!mcpApiKey && (
                <span className="block mt-1 text-amber-500 text-xs">
                  {t("mcpDocs.noApiKeyWarning")}
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
                { value: "generic",        label: t("mcpDocs.tabs.generic") },
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
                    {t("mcpDocs.claudeDesktop.instructions")}
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
                {t("mcpDocs.claudeDesktop.restart")}
              </p>
            </TabsContent>

            {/* ── Claude Code CLI ────────────────────────────────────────── */}
            <TabsContent value="claude-code" className="space-y-4">
              <div className="flex items-start gap-2">
                <Terminal className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Claude Code (CLI)</p>
                  <p className="text-xs text-muted-foreground">
                    {t("mcpDocs.claudeCode.instructions")}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-1.5">{t("mcpDocs.claudeCode.optionA")}</p>
                <CodeBlock code={claudeCodeCmd} label="Terminal" />
              </div>

              <div>
                <p className="text-xs font-medium mb-1.5">
                  {t("mcpDocs.claudeCode.optionB")}
                </p>
                <CodeBlock code={claudeCodeConfig} label=".mcp.json" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium mb-1.5">
                  {t("mcpDocs.claudeCode.optionC")}
                </p>
                <FilePath label="Global" path="~/.claude/mcp.json" />
                <CodeBlock code={claudeCodeConfig} label="~/.claude/mcp.json" />
              </div>

              <p className="text-xs text-muted-foreground">
                {t("mcpDocs.claudeCode.note")}
              </p>
            </TabsContent>

            {/* ── Cursor ─────────────────────────────────────────────────── */}
            <TabsContent value="cursor" className="space-y-4">
              <div className="flex items-start gap-2">
                <Code2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Cursor</p>
                  <p className="text-xs text-muted-foreground">
                    {t("mcpDocs.cursor.instructions")}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-medium">{t("mcpDocs.cursor.optionA")}</p>
                  <FilePath label="" path=".cursor/mcp.json" />
                </div>
                <CodeBlock code={cursorConfig} label=".cursor/mcp.json" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-medium">{t("mcpDocs.cursor.optionB")}</p>
                  <FilePath label="" path="~/.cursor/mcp.json" />
                </div>
                <CodeBlock code={cursorConfig} label="~/.cursor/mcp.json" />
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium">{t("mcpDocs.cursor.visualAlt")}</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>{t("mcpDocs.cursor.step1")}</li>
                  <li>{t("mcpDocs.cursor.step2")}</li>
                  <li>{t("mcpDocs.cursor.step3")}</li>
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
                    {t("mcpDocs.windsurf.instructions")}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <FilePath label="macOS / Linux" path="~/.codeium/windsurf/mcp_config.json" />
                <FilePath label="Windows" path="%USERPROFILE%\.codeium\windsurf\mcp_config.json" />
              </div>

              <CodeBlock code={windsurf} label="mcp_config.json" />

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium">{t("mcpDocs.windsurf.visualAlt")}</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>{t("mcpDocs.windsurf.step1")}</li>
                  <li>{t("mcpDocs.windsurf.step2")}</li>
                  <li>{t("mcpDocs.windsurf.step3")}</li>
                  <li>{t("mcpDocs.windsurf.step4")}</li>
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
                    {t("mcpDocs.vscode.instructions")}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium">{t("mcpDocs.vscode.clinePanel")}</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>{t("mcpDocs.vscode.step1")}</li>
                  <li>{t("mcpDocs.vscode.step2")}</li>
                  <li>{t("mcpDocs.vscode.step3")}</li>
                  <li>
                    {t("mcpDocs.vscode.step4")}{" "}
                    <code className="px-1 py-0.5 rounded bg-muted text-[11px] break-all">{mcpUrl}</code>
                  </li>
                  <li>{t("mcpDocs.vscode.step5")}</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-medium">{t("mcpDocs.vscode.clineConfigFile")}</p>
                  <PlatformBadge label="macOS" />
                </div>
                <FilePath label="macOS" path="~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json" />
                <FilePath label="Windows" path="%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json" />
              </div>

              <CodeBlock code={clineVscodeSettings} label="cline_mcp_settings.json (fragmento)" />

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium">{t("mcpDocs.vscode.nativeTitle")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("mcpDocs.vscode.nativeDescription")}
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
                    {t("mcpDocs.continue.instructions")}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <FilePath label="macOS / Linux" path="~/.continue/config.json" />
                <FilePath label="Windows" path="%USERPROFILE%\.continue\config.json" />
              </div>

              <CodeBlock code={continueDev} label="config.json (fragmento — sección mcpServers)" />

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium">{t("mcpDocs.continue.visualAlt")}</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>{t("mcpDocs.continue.step1")}</li>
                  <li>{t("mcpDocs.continue.step2")}</li>
                  <li>{t("mcpDocs.continue.step3")}</li>
                  <li>{t("mcpDocs.continue.step4")}</li>
                </ol>
              </div>
            </TabsContent>

            {/* ── Genérico / curl ────────────────────────────────────────── */}
            <TabsContent value="generic" className="space-y-4">
              <div className="flex items-start gap-2">
                <Terminal className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("mcpDocs.generic.title")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("mcpDocs.generic.description")}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium">{t("mcpDocs.generic.endpointDetails")}</p>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-border/30">
                    {[
                      ["URL", mcpUrl],
                      [t("mcpDocs.generic.method"), "POST"],
                      ["Content-Type", "application/json"],
                      ["Auth", `Bearer ${key}`],
                      [t("mcpDocs.generic.protocol"), "MCP 2024-11-05 / JSON-RPC 2.0"],
                    ].map(([label, value]) => (
                      <tr key={label} className="py-1">
                        <td className="pr-3 font-medium text-muted-foreground w-28 py-1">{label}</td>
                        <td className="font-mono text-[11px] break-all py-1">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <CodeBlock code={genericFetch} label={t("mcpDocs.generic.curlExamples")} />

              <div>
                <p className="text-xs font-medium mb-1.5">{t("mcpDocs.generic.configLabel")}</p>
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
                  {t("mcpDocs.generic.fullSpec")}{" "}
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
