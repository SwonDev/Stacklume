import { NextRequest, NextResponse } from "next/server";
import { db, generateId, withRetry } from "@/lib/db";
import { links, tags, linkTags } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { tmpdir } from "os";
import { join } from "path";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { detectPlatform } from "@/lib/platform-detection";
import { upsertLinkFts } from "@/lib/db/fts";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface EnrichJobState {
  status: "running" | "done" | "error";
  progress: { current: number; total: number; phase: string };
  results?: {
    enriched: number;
    faviconsAdded: number;
    platformsDetected: number;
    tagsGenerated: number;
    summariesGenerated: number;
    visionTagsGenerated: number;
  };
  error?: string;
}

// ─── Persistencia de jobs en archivos temporales ─────────────────────────────

function jobPath(jobId: string) {
  return join(tmpdir(), `stacklume-enrich-${jobId}.json`);
}

function saveJob(jobId: string, state: EnrichJobState) {
  try { writeFileSync(jobPath(jobId), JSON.stringify(state)); } catch { /* */ }
}

function loadJob(jobId: string): EnrichJobState | null {
  try {
    const p = jobPath(jobId);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as EnrichJobState;
  } catch { return null; }
}

function deleteJob(jobId: string) {
  try { unlinkSync(jobPath(jobId)); } catch { /* */ }
}

const RUNNING_FLAG = join(tmpdir(), "stacklume-enrich-running.flag");
function isRunning() { return existsSync(RUNNING_FLAG); }
function setRunning(v: boolean) {
  try { if (v) writeFileSync(RUNNING_FLAG, "1"); else unlinkSync(RUNNING_FLAG); } catch { /* */ }
}

import { TAG_COLORS as COLOR_PALETTE } from "@/lib/colors";

// ─── Auto-detectar puerto de llama-server ────────────────────────────────────

async function detectLlamaPort(): Promise<string> {
  const candidates = [8080, 8099, 63334, 63335, 63336, 63337, 63338];
  for (const port of candidates) {
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/v1/models`, {
        signal: AbortSignal.timeout(1000),
      });
      if (resp.ok) return port.toString();
    } catch { /* next */ }
  }
  return "0";
}

// ─── Comprobar si el modelo soporta visión (mmproj cargado) ──────────────────

async function checkVisionSupport(llamaPort: string): Promise<boolean> {
  try {
    const resp = await fetch(`http://127.0.0.1:${llamaPort}/v1/models`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!resp.ok) return false;
    const data = await resp.json() as { data?: Array<{ id?: string }> };
    const modelId = data?.data?.[0]?.id?.toLowerCase() ?? "";
    // mmproj solo disponible con el modelo 2B
    return modelId.includes("2b");
  } catch { return false; }
}

// ─── GET: poll job progress ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId requerido" }, { status: 400 });
  const job = loadJob(jobId);
  if (!job) return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
  return NextResponse.json(job);
}

// ─── POST: start enrichment job ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json({ error: "Solo disponible en desktop" }, { status: 403 });
  }

  if (isRunning()) {
    return NextResponse.json({ error: "Ya hay un enriquecimiento en curso" }, { status: 409 });
  }

  let body: { llamaPort?: number };
  try { body = await req.json(); } catch { body = {}; }

  let llamaPort = body.llamaPort && body.llamaPort > 0
    ? body.llamaPort.toString()
    : (process.env.LLAMA_PORT || "0");

  // Auto-detectar puerto si no se proporcionó
  if (!llamaPort || llamaPort === "0") {
    llamaPort = await detectLlamaPort();
  }

  // LLM es opcional para enrichment — favicon + platform funcionan sin él
  const jobId = crypto.randomUUID();
  const state: EnrichJobState = {
    status: "running",
    progress: { current: 0, total: 0, phase: "Cargando biblioteca..." },
  };
  saveJob(jobId, state);

  // Limpiar job viejo después de 15 min
  setTimeout(() => deleteJob(jobId), 15 * 60 * 1000);

  // Ejecutar enriquecimiento en background
  runEnrichJob(jobId, llamaPort);

  return NextResponse.json({ jobId });
}

// ─── Job de enriquecimiento ──────────────────────────────────────────────────

async function runEnrichJob(jobId: string, llamaPort: string) {
  const state: EnrichJobState = loadJob(jobId) || {
    status: "running",
    progress: { current: 0, total: 0, phase: "Cargando biblioteca..." },
  };
  setRunning(true);

  const results = {
    enriched: 0,
    faviconsAdded: 0,
    platformsDetected: 0,
    tagsGenerated: 0,
    summariesGenerated: 0,
    visionTagsGenerated: 0,
  };

  try {
    // ── Phase 1: Cargar datos ──
    state.progress.phase = "Cargando biblioteca...";
    saveJob(jobId, state);

    const allLinks = await withRetry(
      () => db.select().from(links).where(isNull(links.deletedAt)),
      { operationName: "enrich: fetch links" }
    );
    const allTags = await withRetry(
      () => db.select().from(tags).where(isNull(tags.deletedAt)),
      { operationName: "enrich: fetch tags" }
    );
    const allLinkTags = await withRetry(
      () => db.select().from(linkTags),
      { operationName: "enrich: fetch linkTags" }
    );

    // Build lookup: linkId → tag names
    const tagMap = new Map(allTags.map(t => [t.id, t.name]));
    const linkTagMap = new Map<string, Set<string>>();
    for (const lt of allLinkTags) {
      if (!linkTagMap.has(lt.linkId)) linkTagMap.set(lt.linkId, new Set());
      const tagName = tagMap.get(lt.tagId);
      if (tagName) linkTagMap.get(lt.linkId)!.add(tagName.toLowerCase());
    }

    // Filtrar enlaces que necesitan enriquecimiento
    const needsEnrichment = allLinks.filter(link => {
      const noFavicon = !link.faviconUrl;
      const noPlatform = !link.platform;
      const noTags = !linkTagMap.has(link.id) || linkTagMap.get(link.id)!.size === 0;
      const noSummary = !link.summary;
      return noFavicon || noPlatform || noTags || noSummary;
    });

    if (needsEnrichment.length === 0) {
      state.status = "done";
      state.progress = { current: 0, total: 0, phase: "Completado" };
      state.results = results;
      saveJob(jobId, state);
      setRunning(false);
      return;
    }

    // Cap at 200 links
    const toProcess = needsEnrichment.slice(0, 200);
    state.progress.total = toProcess.length;
    saveJob(jobId, state);

    // Comprobar disponibilidad del LLM
    const llmAvailable = llamaPort !== "0";
    const supportsVision = llmAvailable ? await checkVisionSupport(llamaPort) : false;

    // Tag name → id lookup (para reutilizar tags existentes)
    const tagNameToId = new Map(allTags.map(t => [t.name.toLowerCase(), t.id]));
    let tagColorIdx = allTags.length;

    // ── Phase 2: Procesar enlaces ──
    const BATCH_SIZE = 5;
    const batches: typeof toProcess[] = [];
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      batches.push(toProcess.slice(i, i + BATCH_SIZE));
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];

      for (let linkIdx = 0; linkIdx < batch.length; linkIdx++) {
        const link = batch[linkIdx];
        const globalIdx = batchIdx * BATCH_SIZE + linkIdx;
        state.progress.current = globalIdx + 1;
        state.progress.phase = `Enriqueciendo ${globalIdx + 1} de ${toProcess.length}...`;
        saveJob(jobId, state);

        const updates: Record<string, unknown> = {};
        let enriched = false;

        // 1. Favicon — Google Favicons API
        if (!link.faviconUrl) {
          try {
            const url = new URL(link.url);
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
            updates.faviconUrl = faviconUrl;
            results.faviconsAdded++;
            enriched = true;
          } catch { /* URL inválida, skip */ }
        }

        // 2. Platform detection
        if (!link.platform) {
          try {
            const detection = detectPlatform(link.url);
            if (detection.platform !== "generic") {
              updates.platform = detection.platform;
              updates.contentType = detection.contentType;
              updates.platformColor = detection.color;
              results.platformsDetected++;
              enriched = true;
            }
          } catch { /* skip */ }
        }

        // 3. Tags con LLM (si no tiene tags y LLM disponible)
        const existingTags = linkTagMap.get(link.id);
        const noTags = !existingTags || existingTags.size === 0;
        const noSemanticTags = !link.semanticTags;
        const generatedTagNames: string[] = [];

        if ((noTags || noSemanticTags) && llmAvailable) {
          try {
            const tagList = await generateTagsWithLlm(llamaPort, link);
            if (tagList.length > 0) {
              for (const tagName of tagList) {
                const normalizedName = tagName.toLowerCase().trim();
                if (!normalizedName || normalizedName.length > 50) continue;
                generatedTagNames.push(normalizedName);

                // Solo crear linkTags si no tenía tags
                if (noTags) {
                  let tagId = tagNameToId.get(normalizedName);
                  if (!tagId) {
                    tagId = generateId();
                    const color = COLOR_PALETTE[tagColorIdx % COLOR_PALETTE.length];
                    tagColorIdx++;
                    try {
                      await withRetry(
                        () => db.insert(tags).values({
                          id: tagId!,
                          name: tagName.trim(),
                          color,
                          createdAt: new Date(),
                        }),
                        { operationName: `enrich: create tag ${tagName}` }
                      );
                      tagNameToId.set(normalizedName, tagId);
                    } catch {
                      tagId = undefined;
                    }
                  }

                  if (tagId) {
                    try {
                      await withRetry(
                        () => db.insert(linkTags).values({ linkId: link.id, tagId: tagId! }),
                        { operationName: "enrich: assign tag" }
                      );
                      results.tagsGenerated++;
                    } catch { /* duplicate, skip */ }
                  }
                }
              }

              // También guardar en semanticTags (JSON column)
              if (noSemanticTags && generatedTagNames.length > 0) {
                updates.semanticTags = JSON.stringify(generatedTagNames);
              }

              enriched = true;
            }
          } catch { /* LLM failed, skip tags */ }
        }

        // 4. Summary con LLM (si no tiene y LLM disponible)
        if (!link.summary && llmAvailable) {
          try {
            const summary = await generateSummaryWithLlm(llamaPort, link);
            if (summary) {
              updates.summary = summary;
              results.summariesGenerated++;
              enriched = true;
            }
          } catch { /* LLM failed, skip summary */ }
        }

        // 5. Visión: analizar OG image si disponible
        if (supportsVision && link.imageUrl) {
          try {
            const visionTags = await analyzeImageWithVision(llamaPort, link.imageUrl);
            if (visionTags.length > 0) {
              for (const tagName of visionTags) {
                const normalizedName = tagName.toLowerCase().trim();
                if (!normalizedName || normalizedName.length > 50) continue;

                // Verificar que el tag no está ya asignado
                const currentLinkTags = linkTagMap.get(link.id) ?? new Set();
                if (currentLinkTags.has(normalizedName)) continue;

                let tagId = tagNameToId.get(normalizedName);
                if (!tagId) {
                  tagId = generateId();
                  const color = COLOR_PALETTE[tagColorIdx % COLOR_PALETTE.length];
                  tagColorIdx++;
                  try {
                    await withRetry(
                      () => db.insert(tags).values({
                        id: tagId!,
                        name: tagName.trim(),
                        color,
                        createdAt: new Date(),
                      }),
                      { operationName: `enrich: create vision tag ${tagName}` }
                    );
                    tagNameToId.set(normalizedName, tagId);
                  } catch {
                    tagId = undefined;
                  }
                }

                if (tagId) {
                  try {
                    await withRetry(
                      () => db.insert(linkTags).values({ linkId: link.id, tagId: tagId! }),
                      { operationName: "enrich: assign vision tag" }
                    );
                    results.visionTagsGenerated++;
                    // Actualizar lookup local
                    if (!linkTagMap.has(link.id)) linkTagMap.set(link.id, new Set());
                    linkTagMap.get(link.id)!.add(normalizedName);
                  } catch { /* duplicate, skip */ }
                }
              }
              // Append vision tags to semanticTags JSON column
              const existingSemantic: string[] = (() => {
                try {
                  const raw = (updates.semanticTags as string) || link.semanticTags;
                  return raw ? JSON.parse(raw) : [];
                } catch { return []; }
              })();
              const combinedSemantic = [...new Set([
                ...existingSemantic,
                ...visionTags.map(t => t.toLowerCase().trim()),
              ])];
              updates.semanticTags = JSON.stringify(combinedSemantic);

              enriched = true;
            }
          } catch { /* vision failed, skip */ }
        }

        // Aplicar updates al enlace
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date();
          try {
            await withRetry(
              () => db.update(links).set(updates).where(eq(links.id, link.id)),
              { operationName: "enrich: update link" }
            );
          } catch { /* skip */ }
        }

        // Actualizar FTS5
        if (enriched) {
          try {
            await upsertLinkFts({
              id: link.id,
              title: link.title,
              description: (updates.description as string) || link.description || null,
              summary: (updates.summary as string) || link.summary || null,
              url: link.url,
              siteName: link.siteName || null,
              semanticTags: link.semanticTags || null,
              notes: link.notes || null,
            });
          } catch { /* FTS update failed, non-critical */ }
          results.enriched++;
        }
      }
    }

    // ── Completado ──
    state.status = "done";
    state.progress = { current: toProcess.length, total: toProcess.length, phase: "Completado" };
    state.results = results;
    saveJob(jobId, state);
  } catch (err) {
    state.status = "error";
    state.error = err instanceof Error ? err.message : "Error desconocido";
    saveJob(jobId, state);
  } finally {
    setRunning(false);
  }
}

// ─── Generar tags con LLM ────────────────────────────────────────────────────

async function generateTagsWithLlm(
  llamaPort: string,
  link: { url: string; title: string; description: string | null }
): Promise<string[]> {
  const prompt = `Generate 10-15 semantic search tags for this webpage. Tags must be lowercase, specific. Include: topic, technology, language, framework, tool, content type (tutorial, docs, article, tool, library, video). Be specific. NEVER generic tags like "website", "webpage".

Title: ${link.title}
URL: ${link.url}
${link.description ? `Description: ${link.description}` : ""}

Respond ONLY with JSON array: ["tag1", "tag2", ...]`;

  const resp = await fetch(`http://127.0.0.1:${llamaPort}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "local-model",
      messages: [{ role: "user", content: prompt }],
      stream: false,
      temperature: 0.3,
      max_tokens: 200,
      chat_template_kwargs: { enable_thinking: false },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!resp.ok) return [];

  const data = await resp.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  let content = data.choices?.[0]?.message?.content?.trim() ?? "";
  content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  content = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((t): t is string => typeof t === "string")
        .map(t => t.trim())
        .filter(t => t.length > 0 && t.length <= 50)
        .slice(0, 5);
    }
  } catch { /* parse failed */ }

  return [];
}

// ─── Generar resumen con LLM ─────────────────────────────────────────────────

async function generateSummaryWithLlm(
  llamaPort: string,
  link: { url: string; title: string; description: string | null }
): Promise<string | null> {
  const prompt = `Genera un resumen de 1-2 oraciones para este enlace web.

Título: ${link.title}
URL: ${link.url}
${link.description ? `Descripción: ${link.description}` : ""}

RESPONDE SOLO con el resumen en texto plano, sin comillas ni formato.`;

  const resp = await fetch(`http://127.0.0.1:${llamaPort}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "local-model",
      messages: [{ role: "user", content: prompt }],
      stream: false,
      temperature: 0.3,
      max_tokens: 200,
      chat_template_kwargs: { enable_thinking: false },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!resp.ok) return null;

  const data = await resp.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  let content = data.choices?.[0]?.message?.content?.trim() ?? "";
  content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // Limpiar comillas envolventes
  if ((content.startsWith('"') && content.endsWith('"')) ||
      (content.startsWith("'") && content.endsWith("'"))) {
    content = content.slice(1, -1).trim();
  }

  return content.length >= 10 && content.length <= 500 ? content : null;
}

// ─── Analizar imagen con visión ──────────────────────────────────────────────

async function analyzeImageWithVision(
  llamaPort: string,
  imageUrl: string
): Promise<string[]> {
  // Descargar imagen con timeout
  const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
  if (!imgResp.ok) return [];

  const buffer = await imgResp.arrayBuffer();
  // Limitar a 5MB para no sobrecargar el modelo
  if (buffer.byteLength > 5 * 1024 * 1024) return [];

  const base64 = Buffer.from(buffer).toString("base64");
  const mimeType = imgResp.headers.get("content-type") || "image/jpeg";

  const visionResp = await fetch(`http://127.0.0.1:${llamaPort}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "local-model",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "Describe this image in 5-8 keywords for search. Respond with ONLY a JSON array: [\"keyword1\", \"keyword2\", ...]",
          },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
      }],
      stream: false,
      temperature: 0.3,
      max_tokens: 150,
      chat_template_kwargs: { enable_thinking: false },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!visionResp.ok) return [];

  const vData = await visionResp.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  let vContent = vData.choices?.[0]?.message?.content?.trim() ?? "";
  vContent = vContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  vContent = vContent.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    const imageTags = JSON.parse(vContent);
    if (Array.isArray(imageTags)) {
      return imageTags
        .filter((t): t is string => typeof t === "string")
        .map(t => t.toLowerCase().trim())
        .filter(t => t.length > 0 && t.length <= 50)
        .slice(0, 8);
    }
  } catch { /* parse failed */ }

  return [];
}
