import { NextRequest, NextResponse } from "next/server";
import { db, generateId, withRetry } from "@/lib/db";
import { links, categories, tags, linkTags } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { tmpdir } from "os";
import { join } from "path";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface LinkClassification {
  linkId: string;
  category: string | null;
  newCategory: boolean;
  tags: string[];
  newTags: string[];
}

interface ProposedChange {
  linkId: string;
  linkTitle: string;
  linkUrl: string;
  currentCategory: string | null;
  proposedCategory: string | null;
  isNewCategory: boolean;
  currentTags: string[];
  proposedTags: string[];
  newTags: string[];
}

interface ClassifyProposal {
  changes: ProposedChange[];
  newCategories: string[];
  newTags: string[];
  summary: {
    linksToMove: number;
    linksToTag: number;
    skipped: number;
    total: number;
  };
}

interface ClassifyJobState {
  status: "running" | "analyzed" | "done" | "error";
  progress: { current: number; total: number; phase: string };
  proposal?: ClassifyProposal;
  results?: {
    categoriesCreated: string[];
    tagsCreated: string[];
    linksMoved: number;
    linksTagged: number;
  };
  error?: string;
}

// ─── Persistencia de jobs en archivos temporales ─────────────────────────────
// Turbopack puede aislar módulos entre requests, así que globalThis no es fiable.

function jobPath(jobId: string) {
  return join(tmpdir(), `stacklume-classify-${jobId}.json`);
}

function saveJob(jobId: string, state: ClassifyJobState) {
  try { writeFileSync(jobPath(jobId), JSON.stringify(state)); } catch { /* */ }
}

function loadJob(jobId: string): ClassifyJobState | null {
  try {
    const p = jobPath(jobId);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as ClassifyJobState;
  } catch { return null; }
}

function deleteJob(jobId: string) {
  try { unlinkSync(jobPath(jobId)); } catch { /* */ }
}

// Flag de ejecución en curso (también en archivo)
const RUNNING_FLAG = join(tmpdir(), "stacklume-classify-running.flag");
function isRunning() { return existsSync(RUNNING_FLAG); }
function setRunning(v: boolean) {
  try { if (v) writeFileSync(RUNNING_FLAG, "1"); else unlinkSync(RUNNING_FLAG); } catch { /* */ }
}

import { TAG_COLORS as COLOR_PALETTE, CATEGORY_COLORS } from "@/lib/colors";

// ─── Auto-detectar puerto de llama-server ────────────────────────────────────

async function detectLlamaPort(): Promise<string> {
  // Probar puertos comunes donde llama-server podría estar
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

// ─── GET: poll job progress ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId requerido" }, { status: 400 });
  const job = loadJob(jobId);
  if (!job) return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
  return NextResponse.json(job);
}

// ─── POST: start analysis job (NO escribe en BD) ────────────────────────────

export async function POST(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json({ error: "Solo disponible en desktop" }, { status: 403 });
  }

  if (isRunning()) {
    return NextResponse.json({ error: "Ya hay una clasificación en curso" }, { status: 409 });
  }

  let body: { llamaPort?: number; modelFamily?: string };
  try { body = await req.json(); } catch { body = {}; }

  let llamaPort = body.llamaPort && body.llamaPort > 0
    ? body.llamaPort.toString()
    : (process.env.LLAMA_PORT || "0");

  // Auto-detectar puerto si no se proporcionó
  if (!llamaPort || llamaPort === "0") {
    llamaPort = await detectLlamaPort();
  }

  if (!llamaPort || llamaPort === "0") {
    return NextResponse.json({ error: "LLM no disponible" }, { status: 503 });
  }

  const jobId = crypto.randomUUID();
  const state: ClassifyJobState = {
    status: "running",
    progress: { current: 0, total: 0, phase: "Cargando biblioteca..." },
  };
  saveJob(jobId, state);

  // Limpiar job viejo después de 15 min
  setTimeout(() => deleteJob(jobId), 15 * 60 * 1000);

  // Ejecutar análisis en background
  runAnalysisJob(jobId, llamaPort);

  return NextResponse.json({ jobId });
}

// ─── PUT: apply proposal to DB ───────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json({ error: "Solo disponible en desktop" }, { status: 403 });
  }

  let body: { jobId?: string };
  try { body = await req.json(); } catch { body = {}; }

  if (!body.jobId) {
    return NextResponse.json({ error: "jobId requerido" }, { status: 400 });
  }

  const job = loadJob(body.jobId);
  if (!job) return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
  if (job.status !== "analyzed" || !job.proposal) {
    return NextResponse.json({ error: "Job no está en estado de revisión" }, { status: 400 });
  }

  try {
    const results = await applyProposal(job.proposal);
    job.status = "done";
    job.results = results;
    saveJob(body.jobId, job);
    return NextResponse.json(results);
  } catch (err) {
    job.status = "error";
    job.error = err instanceof Error ? err.message : "Error al aplicar";
    saveJob(body.jobId, job);
    return NextResponse.json({ error: job.error }, { status: 500 });
  }
}

// ─── Job de análisis (solo lectura + LLM, NO escribe en BD) ─────────────────

async function runAnalysisJob(jobId: string, llamaPort: string) {
  const state: ClassifyJobState = loadJob(jobId) || {
    status: "running",
    progress: { current: 0, total: 0, phase: "Cargando biblioteca..." },
  };
  setRunning(true);

  try {
    // ── Phase 1: Cargar datos ──
    state.progress.phase = "Cargando biblioteca...";
    saveJob(jobId, state);

    const allLinks = await withRetry(
      () => db.select().from(links).where(isNull(links.deletedAt)),
      { operationName: "classify: fetch links" }
    );
    const allCategories = await withRetry(
      () => db.select().from(categories).where(isNull(categories.deletedAt)),
      { operationName: "classify: fetch categories" }
    );
    const allTags = await withRetry(
      () => db.select().from(tags).where(isNull(tags.deletedAt)),
      { operationName: "classify: fetch tags" }
    );
    const allLinkTags = await withRetry(
      () => db.select().from(linkTags),
      { operationName: "classify: fetch linkTags" }
    );

    // Build lookups
    const catMap = new Map(allCategories.map(c => [c.id, c.name]));
    const tagMap = new Map(allTags.map(t => [t.id, t.name]));
    const linkTagMap = new Map<string, string[]>();
    for (const lt of allLinkTags) {
      const existing = linkTagMap.get(lt.linkId) || [];
      const tagName = tagMap.get(lt.tagId);
      if (tagName) existing.push(tagName);
      linkTagMap.set(lt.linkId, existing);
    }

    // Filtrar enlaces que necesitan clasificación
    const needsClassification = allLinks.filter(link => {
      const hasCat = !!link.categoryId;
      const hasTags = (linkTagMap.get(link.id)?.length ?? 0) > 0;
      return !hasCat || !hasTags;
    });

    if (needsClassification.length === 0) {
      state.status = "analyzed";
      state.progress.phase = "Análisis completado";
      state.proposal = {
        changes: [],
        newCategories: [],
        newTags: [],
        summary: { linksToMove: 0, linksToTag: 0, skipped: allLinks.length, total: allLinks.length },
      };
      saveJob(jobId, state);
      setRunning(false);
      return;
    }

    // Cap at 200
    const toProcess = needsClassification.slice(0, 200);
    const BATCH_SIZE = 10;
    const batches: typeof toProcess[] = [];
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      batches.push(toProcess.slice(i, i + BATCH_SIZE));
    }

    state.progress.total = batches.length;
    saveJob(jobId, state);

    // ── Phase 2: Analizar con LLM ──
    const allClassifications: LinkClassification[] = [];
    const existingCatNames = allCategories.map(c => c.name);
    const existingTagNames = allTags.map(t => t.name);

    for (let i = 0; i < batches.length; i++) {
      state.progress.current = i + 1;
      state.progress.phase = `Analizando lote ${i + 1} de ${batches.length}...`;
      saveJob(jobId, state);

      const batch = batches[i];
      const batchText = batch.map((link, idx) => {
        const catName = link.categoryId ? catMap.get(link.categoryId) || "?" : "(ninguna)";
        const tagNames = linkTagMap.get(link.id)?.join(", ") || "(ninguna)";
        return `${idx + 1}. [id:${link.id}] "${link.title}" | ${link.url} | Cat: ${catName} | Tags: ${tagNames}`;
      }).join("\n");

      const systemPrompt = `Eres un clasificador de enlaces web. Analiza la URL y el título de cada enlace para asignar la categoría y etiquetas MÁS PRECISAS posibles.

CATEGORÍAS EXISTENTES: ${existingCatNames.slice(0, 30).join(", ")}${existingCatNames.length > 30 ? ` (+${existingCatNames.length - 30} más)` : ""}

ETIQUETAS EXISTENTES: ${existingTagNames.slice(0, 50).join(", ")}${existingTagNames.length > 50 ? ` (+${existingTagNames.length - 50} más)` : ""}

REGLAS:
1. Si un enlace NO tiene categoría → asigna la existente más apropiada o crea una nueva (1-3 palabras).
2. Si un enlace NO tiene etiquetas → SIEMPRE sugiere 2-3 etiquetas. NUNCA dejes tags vacío.
3. Si ya tiene categoría, pon category: null.
4. PREFIERE etiquetas/categorías EXISTENTES. Solo crea nuevas si ninguna encaja.
5. Las etiquetas deben describir el contenido: tecnología, tipo de recurso, tema principal.
6. Pon TODAS las etiquetas sugeridas en "tags" (existentes + nuevas). Pon SOLO las nuevas en "newTags".

PISTAS POR DOMINIO (usa la URL para decidir mejor):
- store.steampowered.com, store.epicgames.com, gog.com → Videojuegos (NO herramientas dev)
- youtube.com, vimeo.com → según el título: puede ser Tutorial, Entretenimiento, Música, etc.
- github.com → Desarrollo / Open Source (según el repo)
- figma.com, dribbble.com, behance.com → Diseño
- npmjs.com, pypi.org, crates.io → Librerías / Paquetes
- medium.com, dev.to, hashnode.com → Artículos / Blog
- Si el título menciona "game", "juego", "RPG", "shooter" → Videojuegos
- Si el título menciona "recipe", "receta", "cooking" → Cocina
- NO metas videojuegos/música/entretenimiento en categorías de desarrollo/herramientas

RESPONDE SOLO con JSON array, SIN texto adicional:
[{"linkId":"id","category":"Nombre"|null,"newCategory":true|false,"tags":["tag1","tag2"],"newTags":["solo-nuevas"]}]`;

      try {
        const resp = await fetch(`http://127.0.0.1:${llamaPort}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "local-model",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Clasifica estos enlaces:\n\n${batchText}` },
            ],
            stream: false,
            temperature: 0.3,
            max_tokens: 4096,
            chat_template_kwargs: { enable_thinking: false },
          }),
          signal: AbortSignal.timeout(300_000),
        });

        if (!resp.ok) continue;

        const data = await resp.json() as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        let content = data.choices?.[0]?.message?.content?.trim() ?? "";
        // Limpiar thinking y markdown (por si acaso)
        content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        content = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

        if (!content) continue;

        const classifications = JSON.parse(content) as LinkClassification[];
        if (Array.isArray(classifications)) {
          allClassifications.push(...classifications);
          for (const c of classifications) {
            if (c.category && c.newCategory && !existingCatNames.includes(c.category)) {
              existingCatNames.push(c.category);
            }
            for (const t of c.newTags || []) {
              if (!existingTagNames.includes(t)) existingTagNames.push(t);
            }
          }
        }
      } catch {
        continue;
      }
    }

    // ── Phase 3: Construir propuesta (sin escribir en BD) ──
    state.progress.phase = "Preparando propuesta...";
    saveJob(jobId, state);

    // Comparar contra tags/categorías REALES en BD (no confiar en el LLM para marcar newTags)
    const existingCatNamesLower = new Set(allCategories.map(c => c.name.toLowerCase()));
    const existingTagNamesLower = new Set(allTags.map(t => t.name.toLowerCase()));
    const newCatNames = new Set<string>();
    const newTagNamesSet = new Set<string>();

    const changes: ProposedChange[] = [];
    let linksToMove = 0;
    let linksToTag = 0;
    for (const c of allClassifications) {
      const link = allLinks.find(l => l.id === c.linkId);
      if (!link) continue;

      const currentCategory = link.categoryId ? catMap.get(link.categoryId) || null : null;
      const currentTagsList = linkTagMap.get(link.id) || [];

      // Solo contar como mover si el enlace no tenía categoría
      const willMove = !link.categoryId && !!c.category;
      // Solo contar tags nuevos (no ya asignados)
      const newTagsForLink = (c.tags || []).filter(
        t => !currentTagsList.some(ct => ct.toLowerCase() === t.toLowerCase())
      );
      const willTag = newTagsForLink.length > 0;

      if (willMove) linksToMove++;
      if (willTag) linksToTag++;

      // Detectar categorías/tags realmente nuevos (no existen en BD)
      if (willMove && c.category && !existingCatNamesLower.has(c.category.toLowerCase())) {
        newCatNames.add(c.category);
      }
      for (const t of newTagsForLink) {
        if (!existingTagNamesLower.has(t.toLowerCase())) {
          newTagNamesSet.add(t);
        }
      }

      if (willMove || willTag) {
        changes.push({
          linkId: c.linkId,
          linkTitle: link.title || link.url,
          linkUrl: link.url,
          currentCategory,
          proposedCategory: willMove ? c.category : null,
          isNewCategory: willMove ? !existingCatNamesLower.has((c.category || "").toLowerCase()) : false,
          currentTags: currentTagsList,
          proposedTags: willTag ? newTagsForLink : [],
          newTags: newTagsForLink.filter(t => !existingTagNamesLower.has(t.toLowerCase())),
        });
      }
    }

    state.status = "analyzed";
    state.progress.phase = "Análisis completado";
    state.proposal = {
      changes,
      newCategories: [...newCatNames],
      newTags: [...newTagNamesSet],
      summary: {
        linksToMove,
        linksToTag,
        skipped: allLinks.length - toProcess.length,
        total: allLinks.length,
      },
    };
    saveJob(jobId, state);
  } catch (err) {
    state.status = "error";
    state.error = err instanceof Error ? err.message : "Error desconocido";
    saveJob(jobId, state);
  } finally {
    setRunning(false);
  }
}

// ─── Aplicar propuesta a la BD ───────────────────────────────────────────────

async function applyProposal(proposal: ClassifyProposal) {
  // Re-fetch datos actuales (pueden haber cambiado)
  const allCategories = await withRetry(
    () => db.select().from(categories).where(isNull(categories.deletedAt)),
    { operationName: "apply: fetch categories" }
  );
  const allTags2 = await withRetry(
    () => db.select().from(tags).where(isNull(tags.deletedAt)),
    { operationName: "apply: fetch tags" }
  );

  // Crear categorías nuevas
  let colorIdx = allCategories.length;
  const catNameToId = new Map(allCategories.map(c => [c.name.toLowerCase(), c.id]));

  for (const name of proposal.newCategories) {
    if (catNameToId.has(name.toLowerCase())) continue;
    const id = generateId();
    const color = CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length];
    colorIdx++;
    try {
      await withRetry(
        () => db.insert(categories).values({ id, name, color, createdAt: new Date() }),
        { operationName: `create category: ${name}` }
      );
      catNameToId.set(name.toLowerCase(), id);
    } catch { /* skip duplicate */ }
  }

  // Crear tags nuevos
  const tagNameToId = new Map(allTags2.map(t => [t.name.toLowerCase(), t.id]));
  let tagColorIdx = allTags2.length;

  for (const name of proposal.newTags) {
    if (tagNameToId.has(name.toLowerCase())) continue;
    const id = generateId();
    const color = COLOR_PALETTE[tagColorIdx % COLOR_PALETTE.length];
    tagColorIdx++;
    try {
      await withRetry(
        () => db.insert(tags).values({ id, name, color, createdAt: new Date() }),
        { operationName: `create tag: ${name}` }
      );
      tagNameToId.set(name.toLowerCase(), id);
    } catch { /* skip duplicate */ }
  }

  // Aplicar cambios a enlaces
  let linksMoved = 0;
  let linksTagged = 0;

  const createdCats: string[] = [...proposal.newCategories];
  const createdTags: string[] = [...proposal.newTags];

  for (const change of proposal.changes) {
    // Mover a categoría
    if (change.proposedCategory) {
      let catId = catNameToId.get(change.proposedCategory.toLowerCase());
      // Auto-crear categoría si no existe (el LLM no siempre marca newCategory correctamente)
      if (!catId) {
        catId = generateId();
        const color = CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length];
        colorIdx++;
        try {
          await withRetry(
            () => db.insert(categories).values({ id: catId!, name: change.proposedCategory!, color, createdAt: new Date() }),
            { operationName: `auto-create category: ${change.proposedCategory}` }
          );
          catNameToId.set(change.proposedCategory.toLowerCase(), catId);
          if (!createdCats.includes(change.proposedCategory)) createdCats.push(change.proposedCategory);
        } catch { catId = undefined; }
      }
      if (catId) {
        try {
          await withRetry(
            () => db.update(links).set({ categoryId: catId! }).where(eq(links.id, change.linkId)),
            { operationName: "move link to category" }
          );
          linksMoved++;
        } catch { /* skip */ }
      }
    }

    // Asignar tags
    for (const tagName of change.proposedTags) {
      let tagId = tagNameToId.get(tagName.toLowerCase());
      // Auto-crear tag si no existe (el LLM no siempre marca newTags correctamente)
      if (!tagId) {
        tagId = generateId();
        const color = COLOR_PALETTE[tagColorIdx % COLOR_PALETTE.length];
        tagColorIdx++;
        try {
          await withRetry(
            () => db.insert(tags).values({ id: tagId!, name: tagName, color, createdAt: new Date() }),
            { operationName: `auto-create tag: ${tagName}` }
          );
          tagNameToId.set(tagName.toLowerCase(), tagId);
          if (!createdTags.includes(tagName)) createdTags.push(tagName);
        } catch { tagId = undefined; }
      }
      if (!tagId) continue;
      try {
        await withRetry(
          () => db.insert(linkTags).values({ linkId: change.linkId, tagId: tagId! }),
          { operationName: "tag link" }
        );
        linksTagged++;
      } catch { /* skip duplicate */ }
    }
  }

  return {
    categoriesCreated: createdCats,
    tagsCreated: createdTags,
    linksMoved,
    linksTagged,
  };
}
