import { NextRequest, NextResponse } from "next/server";
import { db, generateId, withRetry } from "@/lib/db";
import { links, categories, tags, linkTags } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ClassifyJobState {
  status: "running" | "done" | "error";
  progress: { current: number; total: number; phase: string };
  results?: {
    categoriesCreated: string[];
    tagsCreated: string[];
    linksMoved: number;
    linksTagged: number;
    skipped: number;
  };
  error?: string;
}

interface LinkClassification {
  linkId: string;
  category: string | null;
  newCategory: boolean;
  tags: string[];
  newTags: string[];
}

// ─── Estado global ───────────────────────────────────────────────────────────

const g = globalThis as unknown as {
  __classifyJobs?: Map<string, ClassifyJobState>;
  __classifyRunning?: boolean;
};
if (!g.__classifyJobs) g.__classifyJobs = new Map();
const jobs = g.__classifyJobs;

// Paleta de colores para categorías/tags nuevos
const COLOR_PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#64748b",
];

// ─── GET: poll job progress ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId requerido" }, { status: 400 });
  const job = jobs.get(jobId);
  if (!job) return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
  return NextResponse.json(job);
}

// ─── POST: start classification job ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json({ error: "Solo disponible en desktop" }, { status: 403 });
  }

  if (g.__classifyRunning) {
    return NextResponse.json({ error: "Ya hay una clasificación en curso" }, { status: 409 });
  }

  let body: { llamaPort?: number; modelFamily?: string };
  try { body = await req.json(); } catch { body = {}; }

  const llamaPort = body.llamaPort && body.llamaPort > 0
    ? body.llamaPort.toString()
    : (process.env.LLAMA_PORT || "0");

  if (!llamaPort || llamaPort === "0") {
    return NextResponse.json({ error: "LLM no disponible" }, { status: 503 });
  }

  const jobId = crypto.randomUUID();
  const state: ClassifyJobState = {
    status: "running",
    progress: { current: 0, total: 0, phase: "Cargando biblioteca..." },
  };
  jobs.set(jobId, state);

  // Limpiar jobs viejos
  setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);

  // Ejecutar en background
  runClassifyJob(jobId, llamaPort, body.modelFamily || "qwen3");

  return NextResponse.json({ jobId });
}

// ─── Job de clasificación ────────────────────────────────────────────────────

async function runClassifyJob(jobId: string, llamaPort: string, modelFamily: string) {
  const state = jobs.get(jobId)!;
  g.__classifyRunning = true;

  try {
    // ── Phase 1: Cargar datos ──
    state.progress.phase = "Cargando biblioteca...";

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
      state.status = "done";
      state.progress.phase = "Completado";
      state.results = { categoriesCreated: [], tagsCreated: [], linksMoved: 0, linksTagged: 0, skipped: allLinks.length };
      g.__classifyRunning = false;
      return;
    }

    // Cap at 200
    const toProcess = needsClassification.slice(0, 200);
    const BATCH_SIZE = 15;
    const batches: typeof toProcess[] = [];
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      batches.push(toProcess.slice(i, i + BATCH_SIZE));
    }

    state.progress.total = batches.length;

    // ── Phase 2: Analizar con LLM ──
    const allClassifications: LinkClassification[] = [];
    const existingCatNames = allCategories.map(c => c.name);
    const existingTagNames = allTags.map(t => t.name);

    for (let i = 0; i < batches.length; i++) {
      state.progress.current = i + 1;
      state.progress.phase = `Analizando lote ${i + 1} de ${batches.length}...`;

      const batch = batches[i];
      const batchText = batch.map((link, idx) => {
        const catName = link.categoryId ? catMap.get(link.categoryId) || "?" : "(ninguna)";
        const tagNames = linkTagMap.get(link.id)?.join(", ") || "(ninguna)";
        return `${idx + 1}. [id:${link.id}] "${link.title}" | ${link.url} | Cat: ${catName} | Tags: ${tagNames}`;
      }).join("\n");

      const systemPrompt = `Eres un clasificador de enlaces web. Analiza cada enlace y asigna categorías y etiquetas.

CATEGORÍAS EXISTENTES: ${existingCatNames.slice(0, 30).join(", ")}${existingCatNames.length > 30 ? ` (+${existingCatNames.length - 30} más)` : ""}

ETIQUETAS EXISTENTES: ${existingTagNames.slice(0, 50).join(", ")}${existingTagNames.length > 50 ? ` (+${existingTagNames.length - 50} más)` : ""}

REGLAS:
1. Si un enlace NO tiene categoría → asigna la existente más apropiada o crea una nueva (1-3 palabras).
2. Si un enlace NO tiene etiquetas → sugiere 1-3 etiquetas existentes o nuevas (1-2 palabras).
3. Si ya tiene categoría, NO la cambies (pon null).
4. PREFIERE categorías/etiquetas EXISTENTES.
5. Nombres de categorías nuevas: concisos, en español.

RESPONDE SOLO con JSON array, SIN texto adicional:
[{"linkId":"id","category":"Nombre"|null,"newCategory":true|false,"tags":["tag1"],"newTags":["nuevo-si-aplica"]}]`;

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
            chat_template_kwargs: { enable_thinking: true },
            reasoning_format: "deepseek",
          }),
          signal: AbortSignal.timeout(120_000),
        });

        if (!resp.ok) continue;

        const data = await resp.json() as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        let content = data.choices?.[0]?.message?.content?.trim() ?? "";
        // Limpiar thinking y markdown
        content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        content = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

        const classifications = JSON.parse(content) as LinkClassification[];
        if (Array.isArray(classifications)) {
          allClassifications.push(...classifications);
          // Añadir categorías/tags nuevos al listado para próximos lotes
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
        // Skip batch on error
        continue;
      }
    }

    // ── Phase 3: Aplicar cambios ──
    state.progress.phase = "Aplicando cambios...";

    // Crear categorías nuevas
    const newCatNames = new Set<string>();
    for (const c of allClassifications) {
      if (c.category && c.newCategory) newCatNames.add(c.category);
    }

    let colorIdx = allCategories.length;
    const catNameToId = new Map(allCategories.map(c => [c.name.toLowerCase(), c.id]));

    for (const name of newCatNames) {
      if (catNameToId.has(name.toLowerCase())) continue;
      const id = generateId();
      const color = COLOR_PALETTE[colorIdx % COLOR_PALETTE.length];
      colorIdx++;
      try {
        await withRetry(
          () => db.insert(categories).values({ id: generateId(), name, color, createdAt: new Date() }),
          { operationName: `create category: ${name}` }
        );
        catNameToId.set(name.toLowerCase(), id);
      } catch { /* skip duplicate */ }
    }

    // Crear tags nuevos
    const newTagNames = new Set<string>();
    for (const c of allClassifications) {
      for (const t of c.newTags || []) newTagNames.add(t);
    }

    const tagNameToId = new Map(allTags.map(t => [t.name.toLowerCase(), t.id]));
    let tagColorIdx = allTags.length;

    for (const name of newTagNames) {
      if (tagNameToId.has(name.toLowerCase())) continue;
      const id = generateId();
      const color = COLOR_PALETTE[tagColorIdx % COLOR_PALETTE.length];
      tagColorIdx++;
      try {
        await withRetry(
          () => db.insert(tags).values({ id: generateId(), name, color, createdAt: new Date() }),
          { operationName: `create tag: ${name}` }
        );
        tagNameToId.set(name.toLowerCase(), id);
      } catch { /* skip duplicate */ }
    }

    // Asignar categorías y tags a enlaces
    let linksMoved = 0;
    let linksTagged = 0;

    for (const c of allClassifications) {
      // Asignar categoría
      if (c.category) {
        const catId = catNameToId.get(c.category.toLowerCase());
        if (catId) {
          // Solo mover si el enlace no tenía categoría
          const link = allLinks.find(l => l.id === c.linkId);
          if (link && !link.categoryId) {
            try {
              await withRetry(
                () => db.update(links).set({ categoryId: catId }).where(eq(links.id, c.linkId)),
                { operationName: `move link to category` }
              );
              linksMoved++;
            } catch { /* skip */ }
          }
        }
      }

      // Asignar tags
      for (const tagName of c.tags || []) {
        const tagId = tagNameToId.get(tagName.toLowerCase());
        if (!tagId) continue;
        // Verificar si ya existe la asociación
        const existingTagNames2 = linkTagMap.get(c.linkId) || [];
        if (existingTagNames2.some(t => t.toLowerCase() === tagName.toLowerCase())) continue;
        try {
          await withRetry(
            () => db.insert(linkTags).values({ linkId: c.linkId, tagId }),
            { operationName: `tag link` }
          );
          linksTagged++;
        } catch { /* skip duplicate */ }
      }
    }

    // ── Phase 4: Done ──
    state.status = "done";
    state.progress.phase = "Completado";
    state.results = {
      categoriesCreated: [...newCatNames],
      tagsCreated: [...newTagNames],
      linksMoved,
      linksTagged,
      skipped: allLinks.length - toProcess.length,
    };
  } catch (err) {
    state.status = "error";
    state.error = err instanceof Error ? err.message : "Error desconocido";
  } finally {
    g.__classifyRunning = false;
  }
}
