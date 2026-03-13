/**
 * Extrae comandos de instalación de herramientas de código HTML.
 * Busca en elementos <code> y <pre> patrones de npm, pnpm, yarn, bun, npx, git clone, cargo, pip.
 */
import * as cheerio from "cheerio";

// Límites para evitar comandos truncados o demasiado largos
const MAX_COMMAND_LENGTH = 300;
const MAX_COMMANDS = 20;

const COMMAND_REGEX =
  /(?:npx|pnpm\s+(?:add|install|dlx|exec)|npm\s+(?:install|i|add)|yarn\s+(?:add|install)|bun\s+(?:add|install|x)|git\s+clone|cargo\s+add|pip\s+install|pip3\s+install)\s+\S[^\n\r]*/gi;

function cleanCommand(raw: string): string {
  return (
    raw
      // Quitar prompt shells: $ > # al inicio
      .replace(/^[\$#>]\s*/, "")
      // Quitar trailing escapes de backslash (comandos multilínea)
      .replace(/\s*\\\s*$/, "")
      .trim()
  );
}

export function extractInstallCommands(html: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const results: string[] = [];

  $("code, pre").each((_, el) => {
    const text = $(el).text();
    if (!text) return;

    COMMAND_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = COMMAND_REGEX.exec(text)) !== null) {
      const cmd = cleanCommand(match[0]);
      if (cmd.length < 5 || cmd.length > MAX_COMMAND_LENGTH) continue;
      if (seen.has(cmd)) continue;
      seen.add(cmd);
      results.push(cmd);
      if (results.length >= MAX_COMMANDS) return false; // salir del each
    }
  });

  return results;
}
