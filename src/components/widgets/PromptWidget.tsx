"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Copy,
  Check,
  Star,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Wand2,
  Filter,
  X,
  Zap,
  ChevronRight,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface PromptWidgetProps {
  widget: Widget;
}

interface Prompt {
  id: string;
  title: string;
  content: string;
  category: PromptCategory;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

type PromptCategory = "coding" | "writing" | "analysis" | "business" | "learning" | "creative" | "general";

interface PromptWidgetConfig {
  prompts?: Prompt[];
  selectedCategory?: PromptCategory | "all" | "favorites";
  searchQuery?: string;
}

const CATEGORY_LABELS: Record<PromptCategory | "all" | "favorites", string> = {
  all: "Todos",
  favorites: "Favoritos",
  coding: "Código",
  writing: "Escritura",
  analysis: "Análisis",
  business: "Negocios",
  learning: "Aprendizaje",
  creative: "Creativo",
  general: "General",
};

const CATEGORY_COLORS: Record<PromptCategory, string> = {
  coding: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  writing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  analysis: "bg-green-500/10 text-green-600 border-green-500/20",
  business: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  learning: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  creative: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  general: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

// Task types for smart generator
type TaskType = "explain" | "analyze" | "create" | "compare" | "summarize" | "solve" | "brainstorm" | "review" | "translate" | "improve";
type OutputFormat = "paragraphs" | "bullets" | "steps" | "table" | "code" | "outline" | "conversation";
type ToneType = "formal" | "casual" | "technical" | "friendly" | "academic" | "creative";
type DepthLevel = "basic" | "intermediate" | "advanced" | "expert";

const TASK_LABELS: Record<TaskType, { label: string; description: string; icon: string }> = {
  explain: { label: "Explicar", description: "Hacer comprensible un concepto", icon: "💡" },
  analyze: { label: "Analizar", description: "Examinar en profundidad", icon: "🔍" },
  create: { label: "Crear", description: "Generar contenido nuevo", icon: "✨" },
  compare: { label: "Comparar", description: "Contrastar opciones", icon: "⚖️" },
  summarize: { label: "Resumir", description: "Condensar información", icon: "📝" },
  solve: { label: "Resolver", description: "Encontrar soluciones", icon: "🧩" },
  brainstorm: { label: "Idear", description: "Generar ideas", icon: "🧠" },
  review: { label: "Revisar", description: "Evaluar y mejorar", icon: "👁️" },
  translate: { label: "Traducir", description: "Adaptar a otro contexto", icon: "🌐" },
  improve: { label: "Mejorar", description: "Optimizar existente", icon: "📈" },
};

const FORMAT_LABELS: Record<OutputFormat, string> = {
  paragraphs: "Párrafos",
  bullets: "Lista con viñetas",
  steps: "Pasos numerados",
  table: "Tabla comparativa",
  code: "Código/pseudocódigo",
  outline: "Esquema jerárquico",
  conversation: "Diálogo/Q&A",
};

const TONE_LABELS: Record<ToneType, string> = {
  formal: "Formal",
  casual: "Casual",
  technical: "Técnico",
  friendly: "Amigable",
  academic: "Académico",
  creative: "Creativo",
};

const DEPTH_LABELS: Record<DepthLevel, { label: string; description: string }> = {
  basic: { label: "Básico", description: "Para principiantes" },
  intermediate: { label: "Intermedio", description: "Conocimiento previo" },
  advanced: { label: "Avanzado", description: "Profundo y detallado" },
  expert: { label: "Experto", description: "Nivel profesional" },
};

// Smart prompt generator function
function generateSmartPrompt(
  concept: string,
  task: TaskType,
  format: OutputFormat,
  tone: ToneType,
  depth: DepthLevel,
  additionalContext?: string
): string {
  const taskPhrases: Record<TaskType, string> = {
    explain: `Explica de manera clara y comprensible`,
    analyze: `Realiza un análisis detallado de`,
    create: `Crea contenido original sobre`,
    compare: `Compara y contrasta las diferentes perspectivas de`,
    summarize: `Resume los puntos más importantes de`,
    solve: `Proporciona una solución para`,
    brainstorm: `Genera ideas innovadoras sobre`,
    review: `Revisa y evalúa críticamente`,
    translate: `Adapta y contextualiza`,
    improve: `Sugiere mejoras y optimizaciones para`,
  };

  const formatInstructions: Record<OutputFormat, string> = {
    paragraphs: "Estructura tu respuesta en párrafos bien organizados con transiciones claras.",
    bullets: "Presenta la información en una lista con viñetas, cada punto siendo conciso pero informativo.",
    steps: "Organiza tu respuesta en pasos numerados secuenciales, fáciles de seguir.",
    table: "Cuando sea apropiado, usa tablas para comparar o estructurar la información.",
    code: "Incluye ejemplos de código o pseudocódigo cuando sea relevante, con comentarios explicativos.",
    outline: "Estructura la respuesta como un esquema jerárquico con secciones y subsecciones.",
    conversation: "Presenta la información en un formato de preguntas y respuestas o diálogo explicativo.",
  };

  const toneInstructions: Record<ToneType, string> = {
    formal: "Usa un tono formal y profesional, evitando expresiones coloquiales.",
    casual: "Mantén un tono conversacional y accesible, como si hablaras con un amigo.",
    technical: "Emplea terminología técnica precisa y definiciones exactas.",
    friendly: "Sé cercano y motivador, usando ejemplos cotidianos.",
    academic: "Adopta un estilo académico con referencias a teorías y metodologías.",
    creative: "Sé imaginativo y usa metáforas, analogías y ejemplos creativos.",
  };

  const depthInstructions: Record<DepthLevel, string> = {
    basic: "Asume que el lector no tiene conocimiento previo. Usa analogías simples y evita jerga técnica.",
    intermediate: "Asume conocimiento básico del tema. Puedes usar terminología estándar con breves explicaciones.",
    advanced: "Profundiza en detalles técnicos y matices. Incluye casos especiales y consideraciones avanzadas.",
    expert: "Trata el tema a nivel profesional/experto. Incluye mejores prácticas, patrones avanzados y discusión de trade-offs.",
  };

  let prompt = `${taskPhrases[task]} "${concept}".\n\n`;
  prompt += `## Instrucciones de formato\n${formatInstructions[format]}\n\n`;
  prompt += `## Tono\n${toneInstructions[tone]}\n\n`;
  prompt += `## Nivel de profundidad\n${depthInstructions[depth]}\n\n`;

  if (additionalContext) {
    prompt += `## Contexto adicional\n${additionalContext}\n\n`;
  }

  prompt += `## Requisitos adicionales\n`;
  prompt += `- Sé preciso y evita información incorrecta\n`;
  prompt += `- Incluye ejemplos prácticos cuando sea posible\n`;
  prompt += `- Si hay limitaciones o advertencias importantes, menciónalas\n`;
  prompt += `- Estructura la respuesta para máxima claridad y utilidad`;

  return prompt;
}

const PROMPT_TEMPLATES = [
  // CODING
  {
    title: "🔧 Revisar código completo",
    content: `Actúa como un senior developer experto en {{lenguaje}}. Revisa el siguiente código y proporciona:

## Análisis requerido:
1. **Bugs y errores potenciales** - Identifica problemas que podrían causar fallos
2. **Seguridad** - Vulnerabilidades como inyección SQL, XSS, etc.
3. **Performance** - Cuellos de botella y optimizaciones posibles
4. **Legibilidad** - Nombres, estructura, comentarios
5. **Mejores prácticas** - Patrones y convenciones del lenguaje
6. **Tests** - Sugerencias de casos de prueba

## Formato de respuesta:
Para cada issue encontrado:
- 🔴 Crítico / 🟡 Importante / 🟢 Sugerencia
- Línea(s) afectada(s)
- Problema identificado
- Solución propuesta con código

\`\`\`{{lenguaje}}
{{codigo}}
\`\`\``,
    category: "coding" as PromptCategory,
  },
  {
    title: "🐛 Debug avanzado",
    content: `Ayúdame a debuggear este problema actuando como un detective de código:

**Error:** {{error}}
**Comportamiento esperado:** {{esperado}}
**Comportamiento actual:** {{actual}}

\`\`\`{{lenguaje}}
{{codigo}}
\`\`\`

**Contexto adicional:** {{contexto}}

Por favor:
1. **Hipótesis** - Lista 3 posibles causas ordenadas por probabilidad
2. **Investigación** - Qué verificar para cada hipótesis
3. **Diagnóstico** - La causa más probable basada en la evidencia
4. **Solución** - Código corregido con explicación
5. **Prevención** - Cómo evitar este error en el futuro`,
    category: "coding" as PromptCategory,
  },
  {
    title: "🏗️ Arquitectura de software",
    content: `Diseña la arquitectura para: {{proyecto}}

**Requisitos funcionales:**
{{requisitos}}

**Restricciones técnicas:**
- Stack tecnológico: {{stack}}
- Escala esperada: {{escala}}
- Presupuesto/recursos: {{recursos}}

Proporciona:
1. **Diagrama de arquitectura** (descripción textual detallada)
2. **Componentes principales** y sus responsabilidades
3. **Flujo de datos** entre componentes
4. **Decisiones de diseño** con justificación (trade-offs)
5. **Patrones utilizados** y por qué
6. **Puntos de escalabilidad** y posibles cuellos de botella
7. **Plan de implementación** por fases`,
    category: "coding" as PromptCategory,
  },
  {
    title: "📚 Documentar código",
    content: `Genera documentación completa para este código:

\`\`\`{{lenguaje}}
{{codigo}}
\`\`\`

Incluye:
1. **README** con descripción, instalación y uso
2. **Docstrings/JSDoc** para cada función/método
3. **Ejemplos de uso** con casos comunes
4. **API Reference** si aplica
5. **Diagrama de flujo** (en texto/mermaid)
6. **Guía de contribución** básica`,
    category: "coding" as PromptCategory,
  },

  // WRITING
  {
    title: "✍️ Artículo completo",
    content: `Escribe un artículo profesional sobre: {{tema}}

**Especificaciones:**
- Audiencia: {{audiencia}}
- Tono: {{tono}}
- Longitud: {{longitud}} palabras aproximadamente
- Propósito: {{proposito}}

**Estructura requerida:**
1. **Título** - Atractivo y con palabras clave
2. **Hook/Introducción** - Captura la atención en las primeras 50 palabras
3. **Cuerpo** - Desarrolla 3-5 puntos principales con ejemplos
4. **Datos/Estadísticas** - Incluye información verificable
5. **Conclusión** - Resumen + Call to action
6. **Meta descripción** - 150-160 caracteres para SEO`,
    category: "writing" as PromptCategory,
  },
  {
    title: "📧 Email persuasivo",
    content: `Redacta un email efectivo para: {{objetivo}}

**Contexto:**
- Destinatario: {{destinatario}}
- Relación: {{relacion}}
- Situación: {{situacion}}

**El email debe:**
1. Tener un asunto irresistible (máx 50 caracteres)
2. Abrir con algo relevante para el receptor
3. Presentar el punto principal en las primeras 2 líneas
4. Incluir beneficios claros (qué gana el receptor)
5. Tener un CTA específico y fácil de ejecutar
6. Ser conciso (máximo 150 palabras)

**Proporciona 3 versiones:**
- A: Formal
- B: Casual pero profesional
- C: Directo y urgente`,
    category: "writing" as PromptCategory,
  },
  {
    title: "📱 Copy para redes sociales",
    content: `Crea contenido para redes sociales sobre: {{tema}}

**Marca/Voz:** {{voz}}
**Objetivo:** {{objetivo}}

Genera para cada plataforma:

**Twitter/X (3 variantes):**
- Máx 280 caracteres
- Con hashtags relevantes
- Incluye emoji estratégico

**LinkedIn (2 variantes):**
- Profesional pero humano
- Incluye pregunta para engagement
- 150-300 palabras

**Instagram (2 variantes):**
- Caption engaging
- Emojis apropiados
- 5-10 hashtags relevantes
- CTA al final`,
    category: "writing" as PromptCategory,
  },

  // ANALYSIS
  {
    title: "📊 Análisis de datos profundo",
    content: `Analiza los siguientes datos como un data analyst senior:

**Datos:**
{{datos}}

**Contexto del negocio:** {{contexto}}
**Pregunta principal:** {{pregunta}}

**Entrega:**
1. **Resumen ejecutivo** (3-4 bullets)
2. **Análisis descriptivo** - Qué muestran los datos
3. **Patrones identificados** - Tendencias, anomalías, correlaciones
4. **Insights accionables** - Qué hacer con esta información
5. **Limitaciones** - Qué no podemos concluir
6. **Recomendaciones** - Próximos pasos ordenados por impacto
7. **Visualizaciones sugeridas** - Qué gráficos contarían mejor la historia`,
    category: "analysis" as PromptCategory,
  },
  {
    title: "🆚 Comparativa detallada",
    content: `Realiza una comparativa exhaustiva entre: {{opciones}}

**Criterios de evaluación:**
{{criterios}}

**Contexto de uso:** {{contexto}}
**Prioridades:** {{prioridades}}

**Formato de análisis:**
| Criterio | Opción A | Opción B | Ganador |
|----------|----------|----------|---------|

Para cada criterio:
- Puntuación 1-10
- Justificación breve
- Consideraciones especiales

**Conclusión:**
- Recomendación general
- Mejor opción según escenario
- Cuándo elegir cada una`,
    category: "analysis" as PromptCategory,
  },
  {
    title: "🔬 Investigación de mercado",
    content: `Realiza un análisis de mercado para: {{producto_servicio}}

**Industria:** {{industria}}
**Geografía:** {{geografia}}

**Análisis requerido:**

1. **Tamaño del mercado** (TAM, SAM, SOM estimados)
2. **Tendencias** principales (3-5)
3. **Competidores** - Directos e indirectos
4. **Análisis FODA** del concepto
5. **Perfil del cliente ideal** (ICP)
6. **Barreras de entrada**
7. **Oportunidades identificadas**
8. **Riesgos principales**
9. **Recomendaciones estratégicas**

*Nota: Indica cuando la información sea estimada o requiera validación.*`,
    category: "analysis" as PromptCategory,
  },

  // BUSINESS
  {
    title: "💼 Plan de negocio express",
    content: `Crea un plan de negocio conciso para: {{idea}}

**Canvas del modelo:**

1. **Propuesta de valor única**
2. **Segmentos de cliente** (2-3 principales)
3. **Canales** de distribución/venta
4. **Relación con clientes**
5. **Fuentes de ingresos** con pricing sugerido
6. **Recursos clave**
7. **Actividades clave**
8. **Partners estratégicos**
9. **Estructura de costos**

**Validación:**
- 3 hipótesis críticas a probar
- Experimentos sugeridos para cada una
- Métricas de éxito (OKRs)

**Roadmap 90 días:**
- Mes 1: [Objetivos]
- Mes 2: [Objetivos]
- Mes 3: [Objetivos]`,
    category: "business" as PromptCategory,
  },
  {
    title: "📈 Estrategia de crecimiento",
    content: `Diseña una estrategia de crecimiento para: {{empresa_producto}}

**Situación actual:**
- Métricas actuales: {{metricas}}
- Objetivo: {{objetivo}}
- Timeframe: {{tiempo}}
- Presupuesto: {{presupuesto}}

**Análisis y estrategia:**

1. **North Star Metric** recomendada
2. **Modelo de growth** (product-led, sales-led, etc.)
3. **Canales de adquisición** priorizados
4. **Estrategias de activación**
5. **Tácticas de retención**
6. **Loops virales** posibles
7. **Quick wins** (impacto alto, esfuerzo bajo)
8. **Experimentos** a ejecutar (priorizado por ICE)
9. **Dashboard** de métricas sugerido`,
    category: "business" as PromptCategory,
  },

  // LEARNING
  {
    title: "🎓 Plan de aprendizaje personalizado",
    content: `Crea un plan de aprendizaje para: {{tema}}

**Mi perfil:**
- Nivel actual: {{nivel}}
- Tiempo disponible: {{tiempo}} horas/semana
- Estilo de aprendizaje preferido: {{estilo}}
- Objetivo: {{objetivo}}

**Plan estructurado:**

1. **Roadmap visual** del aprendizaje
2. **Fundamentos** (semana 1-2)
3. **Conceptos intermedios** (semana 3-4)
4. **Práctica aplicada** (semana 5-6)
5. **Proyecto final** para consolidar

**Para cada fase incluye:**
- Recursos gratuitos recomendados
- Ejercicios prácticos
- Checkpoints de progreso
- Errores comunes a evitar

**Bonus:**
- Comunidades donde aprender
- Proyectos para el portfolio
- Certificaciones relevantes`,
    category: "learning" as PromptCategory,
  },
  {
    title: "🧠 Explicación Feynman",
    content: `Explícame {{concepto}} usando la técnica Feynman:

**Nivel de audiencia:** {{audiencia}}

**Estructura:**
1. **Explicación simple** - Como si tuviera 12 años
2. **Analogía cotidiana** - Relación con algo familiar
3. **El concepto en profundidad** - Ahora con más detalle
4. **Ejemplo práctico** - Aplicación real
5. **Errores comunes** - Malentendidos frecuentes
6. **Conexiones** - Cómo se relaciona con otros conceptos
7. **Test de comprensión** - 3 preguntas para verificar entendimiento
8. **Para explorar más** - Siguiente paso lógico en el aprendizaje`,
    category: "learning" as PromptCategory,
  },

  // CREATIVE
  {
    title: "💡 Brainstorming estructurado",
    content: `Genera ideas creativas para: {{desafio}}

**Contexto:** {{contexto}}
**Restricciones:** {{restricciones}}

**Método de ideación (usa todos):**

1. **SCAMPER** (2 ideas por técnica):
   - Sustituir
   - Combinar
   - Adaptar
   - Modificar
   - Proponer otros usos
   - Eliminar
   - Reordenar

2. **Ideas locas** - 3 conceptos sin restricciones

3. **Inversión** - ¿Y si hiciéramos lo opuesto?

4. **Analogías** - Soluciones de otras industrias

5. **Mashup** - Combina 2 ideas anteriores

**Evaluación:**
Clasifica las top 5 ideas por:
- Innovación (1-5)
- Viabilidad (1-5)
- Impacto potencial (1-5)`,
    category: "creative" as PromptCategory,
  },
  {
    title: "🎨 Brief creativo",
    content: `Desarrolla un brief creativo para: {{proyecto}}

**Información base:**
- Cliente/Marca: {{marca}}
- Producto/Servicio: {{producto}}
- Presupuesto: {{presupuesto}}

**Brief completo:**

1. **Background** - Contexto y situación actual
2. **Objetivo** - Qué queremos lograr (SMART)
3. **Target** - Audiencia detallada con insights
4. **Mensaje clave** - La única cosa que deben recordar
5. **Tono y personalidad** - Cómo debe sentirse
6. **Mandatorios** - Lo que debe incluir sí o sí
7. **No-gos** - Lo que debemos evitar
8. **Entregables** - Lista específica
9. **Timeline** - Fechas clave
10. **Inspiración** - 3-5 referencias visuales/conceptuales`,
    category: "creative" as PromptCategory,
  },

  // GENERAL
  {
    title: "📋 Resumen ejecutivo pro",
    content: `Crea un resumen ejecutivo de: {{documento_tema}}

**Contenido original:**
{{contenido}}

**Formato del resumen:**

📌 **TL;DR** (máximo 2 oraciones)

🎯 **Puntos clave** (5 bullets máximo)

💡 **Insights principales**

⚠️ **Riesgos/Consideraciones**

✅ **Recomendaciones/Próximos pasos**

📊 **Datos destacados** (si aplica)

🔗 **Temas relacionados** para explorar`,
    category: "general" as PromptCategory,
  },
  {
    title: "🤔 Toma de decisiones",
    content: `Ayúdame a decidir entre: {{opciones}}

**Contexto de la decisión:**
{{contexto}}

**Mis prioridades:**
{{prioridades}}

**Análisis estructurado:**

1. **Clarifica** - ¿Cuál es realmente la decisión?
2. **Criterios** - Factores importantes ponderados
3. **Matriz de decisión** - Evalúa cada opción
4. **Escenarios** - Mejor/peor/probable caso por opción
5. **Reversibilidad** - ¿Se puede deshacer? Costo de error
6. **Sesgos** - ¿Qué podría estar nublando mi juicio?
7. **Pre-mortem** - Si esta decisión falla, ¿por qué sería?
8. **Recomendación** - Tu sugerencia con justificación
9. **Plan B** - Alternativa si la decisión no funciona`,
    category: "general" as PromptCategory,
  },
  {
    title: "🔄 Feedback constructivo",
    content: `Proporciona feedback sobre: {{trabajo}}

**Contexto:**
- Tipo de trabajo: {{tipo}}
- Nivel de experiencia del autor: {{nivel}}
- Objetivo del trabajo: {{objetivo}}

**Trabajo a revisar:**
{{contenido}}

**Estructura del feedback (método SBI+):**

✅ **Fortalezas** - Qué está funcionando bien
📈 **Áreas de mejora** - Con sugerencias específicas
💡 **Sugerencias concretas** - Cambios accionables
🎯 **Prioridades** - Las 3 mejoras de mayor impacto
🌟 **Potencial** - Cómo podría ser excepcional

*Mantén un tono constructivo y motivador.*`,
    category: "general" as PromptCategory,
  },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function PromptWidget({ widget }: PromptWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isSmartGeneratorOpen, setIsSmartGeneratorOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState<PromptCategory>("general");
  const [formTags, setFormTags] = useState("");

  // Smart generator state
  const [smartConcept, setSmartConcept] = useState("");
  const [smartTask, setSmartTask] = useState<TaskType>("explain");
  const [smartFormat, setSmartFormat] = useState<OutputFormat>("paragraphs");
  const [smartTone, setSmartTone] = useState<ToneType>("friendly");
  const [smartDepth, setSmartDepth] = useState<DepthLevel>("intermediate");
  const [smartContext, setSmartContext] = useState("");
  const [generatedPreview, setGeneratedPreview] = useState("");

  const config = widget.config as PromptWidgetConfig | undefined;
  const prompts = config?.prompts || [];
  const selectedCategory = config?.selectedCategory || "all";
  const searchQuery = config?.searchQuery || "";

  const updateConfig = useCallback(
    (updates: Partial<PromptWidgetConfig>) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          ...updates,
        } as Record<string, unknown>,
      });
    },
    [widget.id, widget.config]
  );

  // Filter and search prompts
  const filteredPrompts = useMemo(() => {
    let filtered = prompts;

    // Filter by category
    if (selectedCategory === "favorites") {
      filtered = filtered.filter((p) => p.isFavorite);
    } else if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.content.toLowerCase().includes(query) ||
          p.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort by usage count (most used first), then by creation date
    return filtered.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [prompts, selectedCategory, searchQuery]);

  const handleCopy = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);

      // Increment usage count
      const updatedPrompts = prompts.map((p) =>
        p.id === prompt.id ? { ...p, usageCount: p.usageCount + 1 } : p
      );
      updateConfig({ prompts: updatedPrompts });

      toast.success("Prompt copiado", {
        description: prompt.title,
      });
    } catch (error) {
      console.error("Failed to copy prompt:", error);
      toast.error("Error al copiar");
    }
  };

  const handleToggleFavorite = (promptId: string) => {
    const updatedPrompts = prompts.map((p) =>
      p.id === promptId ? { ...p, isFavorite: !p.isFavorite, updatedAt: new Date().toISOString() } : p
    );
    updateConfig({ prompts: updatedPrompts });
  };

  const handleAddPrompt = () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error("Completa los campos requeridos");
      return;
    }

    const now = new Date().toISOString();
    const newPrompt: Prompt = {
      id: generateId(),
      title: formTitle.trim(),
      content: formContent.trim(),
      category: formCategory,
      tags: formTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t),
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };

    updateConfig({ prompts: [...prompts, newPrompt] });
    toast.success("Prompt añadido", {
      description: newPrompt.title,
    });

    // Reset form
    setFormTitle("");
    setFormContent("");
    setFormCategory("general");
    setFormTags("");
    setIsAddDialogOpen(false);
  };

  const handleEditPrompt = () => {
    if (!editingPrompt || !formTitle.trim() || !formContent.trim()) {
      toast.error("Completa los campos requeridos");
      return;
    }

    const updatedPrompts = prompts.map((p) =>
      p.id === editingPrompt.id
        ? {
            ...p,
            title: formTitle.trim(),
            content: formContent.trim(),
            category: formCategory,
            tags: formTags
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t),
          }
        : p
    );

    updateConfig({ prompts: updatedPrompts });
    toast.success("Prompt actualizado");

    setEditingPrompt(null);
    setIsEditDialogOpen(false);
  };

  const handleDeletePrompt = (promptId: string) => {
    const updatedPrompts = prompts.filter((p) => p.id !== promptId);
    updateConfig({ prompts: updatedPrompts });
    toast.success("Prompt eliminado");
  };

  const openEditDialog = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormTitle(prompt.title);
    setFormContent(prompt.content);
    setFormCategory(prompt.category);
    setFormTags(prompt.tags.join(", "));
    setIsEditDialogOpen(true);
  };

  const handleUseTemplate = (template: typeof PROMPT_TEMPLATES[0]) => {
    setFormTitle(template.title);
    setFormContent(template.content);
    setFormCategory(template.category);
    setIsGeneratorOpen(false);
    setIsAddDialogOpen(true);
  };

  // Smart generator functions
  const handleGeneratePreview = useCallback(() => {
    if (!smartConcept.trim()) {
      setGeneratedPreview("");
      return;
    }
    const preview = generateSmartPrompt(
      smartConcept,
      smartTask,
      smartFormat,
      smartTone,
      smartDepth,
      smartContext
    );
    setGeneratedPreview(preview);
  }, [smartConcept, smartTask, smartFormat, smartTone, smartDepth, smartContext]);

  // Auto-generate preview when params change
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      handleGeneratePreview();
    });
    return () => cancelAnimationFrame(frame);
  }, [handleGeneratePreview]);

  const handleSaveSmartPrompt = () => {
    if (!smartConcept.trim() || !generatedPreview) {
      toast.error("Escribe un concepto para generar el prompt");
      return;
    }

    const taskLabel = TASK_LABELS[smartTask].label;
    const title = `${TASK_LABELS[smartTask].icon} ${taskLabel}: ${smartConcept.slice(0, 30)}${smartConcept.length > 30 ? "..." : ""}`;

    // Map task to category
    const taskToCategoryMap: Record<TaskType, PromptCategory> = {
      explain: "learning",
      analyze: "analysis",
      create: "creative",
      compare: "analysis",
      summarize: "general",
      solve: "coding",
      brainstorm: "creative",
      review: "coding",
      translate: "writing",
      improve: "general",
    };

    const now = new Date().toISOString();
    const newPrompt: Prompt = {
      id: generateId(),
      title,
      content: generatedPreview,
      category: taskToCategoryMap[smartTask],
      tags: [smartTask, smartDepth, smartTone],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };

    updateConfig({ prompts: [...prompts, newPrompt] });
    toast.success("Prompt inteligente creado", {
      description: title,
    });

    // Reset smart generator
    setSmartConcept("");
    setSmartContext("");
    setGeneratedPreview("");
    setIsSmartGeneratorOpen(false);
  };

  const handleCopyGeneratedPrompt = async () => {
    if (!generatedPreview) return;
    try {
      await navigator.clipboard.writeText(generatedPreview);
      toast.success("Prompt copiado al portapapeles");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Error al copiar");
    }
  };

  const handleCategoryChange = (category: PromptCategory | "all" | "favorites") => {
    updateConfig({ selectedCategory: category });
  };

  const handleSearchChange = (query: string) => {
    updateConfig({ searchQuery: query });
  };

  // Empty state
  if (prompts.length === 0) {
    return (
      <div className="@container h-full w-full">
        <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 via-blue-500 to-purple-500 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Sin prompts guardados</p>
          <p className="text-xs text-muted-foreground/60 mb-4">
            Crea o genera prompts para IA
          </p>
          <div className="flex flex-col gap-2 relative z-10">
            <Button
              type="button"
              size="sm"
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsSmartGeneratorOpen(true);
              }}
              className="bg-gradient-to-r from-amber-500 via-purple-500 to-blue-500 text-white hover:opacity-90"
            >
              <Zap className="w-4 h-4 mr-2" />
              Generador Inteligente
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsGeneratorOpen(true);
                }}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Plantillas
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsAddDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Manual
              </Button>
            </div>
          </div>
        </div>

        {/* Dialogs */}
        <PromptDialogs
          isAddDialogOpen={isAddDialogOpen}
          isEditDialogOpen={isEditDialogOpen}
          isGeneratorOpen={isGeneratorOpen}
          isSmartGeneratorOpen={isSmartGeneratorOpen}
          setIsAddDialogOpen={setIsAddDialogOpen}
          setIsEditDialogOpen={setIsEditDialogOpen}
          setIsGeneratorOpen={setIsGeneratorOpen}
          setIsSmartGeneratorOpen={setIsSmartGeneratorOpen}
          formTitle={formTitle}
          formContent={formContent}
          formCategory={formCategory}
          formTags={formTags}
          setFormTitle={setFormTitle}
          setFormContent={setFormContent}
          setFormCategory={setFormCategory}
          setFormTags={setFormTags}
          handleAddPrompt={handleAddPrompt}
          handleEditPrompt={handleEditPrompt}
          handleUseTemplate={handleUseTemplate}
          smartConcept={smartConcept}
          smartTask={smartTask}
          smartFormat={smartFormat}
          smartTone={smartTone}
          smartDepth={smartDepth}
          smartContext={smartContext}
          generatedPreview={generatedPreview}
          setSmartConcept={setSmartConcept}
          setSmartTask={setSmartTask}
          setSmartFormat={setSmartFormat}
          setSmartTone={setSmartTone}
          setSmartDepth={setSmartDepth}
          setSmartContext={setSmartContext}
          handleSaveSmartPrompt={handleSaveSmartPrompt}
          handleCopyGeneratedPrompt={handleCopyGeneratedPrompt}
        />
      </div>
    );
  }

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full">
        {/* Header with search and filters */}
        <div className="p-3 @sm:p-4 border-b space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar prompts..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => handleSearchChange("")}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
              onClick={() => setIsSmartGeneratorOpen(true)}
              title="Generador inteligente"
            >
              <Zap className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setIsGeneratorOpen(true)}
              title="Plantillas"
            >
              <Wand2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setIsAddDialogOpen(true)}
              title="Agregar prompt"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {(["all", "favorites", "coding", "writing", "analysis", "business", "learning", "creative", "general"] as const).map(
              (cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs flex-shrink-0"
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat === "favorites" && <Star className="w-3 h-3 mr-1" />}
                  {CATEGORY_LABELS[cat]}
                </Button>
              )
            )}
          </div>
        </div>

        {/* Prompts list */}
        <ScrollArea className="flex-1">
          <div className="p-3 @sm:p-4 space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredPrompts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-muted-foreground"
                >
                  <Search className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No se encontraron prompts</p>
                </motion.div>
              ) : (
                filteredPrompts.map((prompt, index) => (
                  <motion.div
                    key={prompt.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                    className="group relative"
                  >
                    <div className="flex gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">
                              {prompt.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {prompt.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-7 w-7 p-0",
                                prompt.isFavorite && "text-amber-500"
                              )}
                              onClick={() => handleToggleFavorite(prompt.id)}
                            >
                              <Star
                                className={cn(
                                  "w-3.5 h-3.5",
                                  prompt.isFavorite && "fill-current"
                                )}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleCopy(prompt)}
                            >
                              {copiedId === prompt.id ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(prompt)}
                                >
                                  <Edit className="w-3.5 h-3.5 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeletePrompt(prompt.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", CATEGORY_COLORS[prompt.category])}
                          >
                            {CATEGORY_LABELS[prompt.category]}
                          </Badge>
                          {prompt.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs bg-muted"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {prompt.usageCount > 0 && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              {prompt.usageCount} {prompt.usageCount === 1 ? "uso" : "usos"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer stats */}
        <div className="border-t p-2 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
            <span>{filteredPrompts.length} prompts</span>
            <span>{prompts.filter((p) => p.isFavorite).length} favoritos</span>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <PromptDialogs
        isAddDialogOpen={isAddDialogOpen}
        isEditDialogOpen={isEditDialogOpen}
        isGeneratorOpen={isGeneratorOpen}
        isSmartGeneratorOpen={isSmartGeneratorOpen}
        setIsAddDialogOpen={setIsAddDialogOpen}
        setIsEditDialogOpen={setIsEditDialogOpen}
        setIsGeneratorOpen={setIsGeneratorOpen}
        setIsSmartGeneratorOpen={setIsSmartGeneratorOpen}
        formTitle={formTitle}
        formContent={formContent}
        formCategory={formCategory}
        formTags={formTags}
        setFormTitle={setFormTitle}
        setFormContent={setFormContent}
        setFormCategory={setFormCategory}
        setFormTags={setFormTags}
        handleAddPrompt={handleAddPrompt}
        handleEditPrompt={handleEditPrompt}
        handleUseTemplate={handleUseTemplate}
        smartConcept={smartConcept}
        smartTask={smartTask}
        smartFormat={smartFormat}
        smartTone={smartTone}
        smartDepth={smartDepth}
        smartContext={smartContext}
        generatedPreview={generatedPreview}
        setSmartConcept={setSmartConcept}
        setSmartTask={setSmartTask}
        setSmartFormat={setSmartFormat}
        setSmartTone={setSmartTone}
        setSmartDepth={setSmartDepth}
        setSmartContext={setSmartContext}
        handleSaveSmartPrompt={handleSaveSmartPrompt}
        handleCopyGeneratedPrompt={handleCopyGeneratedPrompt}
      />
    </div>
  );
}

// Dialogs component to avoid duplication
interface PromptDialogsProps {
  isAddDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isGeneratorOpen: boolean;
  isSmartGeneratorOpen: boolean;
  setIsAddDialogOpen: (open: boolean) => void;
  setIsEditDialogOpen: (open: boolean) => void;
  setIsGeneratorOpen: (open: boolean) => void;
  setIsSmartGeneratorOpen: (open: boolean) => void;
  formTitle: string;
  formContent: string;
  formCategory: PromptCategory;
  formTags: string;
  setFormTitle: (title: string) => void;
  setFormContent: (content: string) => void;
  setFormCategory: (category: PromptCategory) => void;
  setFormTags: (tags: string) => void;
  handleAddPrompt: () => void;
  handleEditPrompt: () => void;
  handleUseTemplate: (template: typeof PROMPT_TEMPLATES[0]) => void;
  // Smart generator props
  smartConcept: string;
  smartTask: TaskType;
  smartFormat: OutputFormat;
  smartTone: ToneType;
  smartDepth: DepthLevel;
  smartContext: string;
  generatedPreview: string;
  setSmartConcept: (value: string) => void;
  setSmartTask: (value: TaskType) => void;
  setSmartFormat: (value: OutputFormat) => void;
  setSmartTone: (value: ToneType) => void;
  setSmartDepth: (value: DepthLevel) => void;
  setSmartContext: (value: string) => void;
  handleSaveSmartPrompt: () => void;
  handleCopyGeneratedPrompt: () => void;
}

function PromptDialogs({
  isAddDialogOpen,
  isEditDialogOpen,
  isGeneratorOpen,
  isSmartGeneratorOpen,
  setIsAddDialogOpen,
  setIsEditDialogOpen,
  setIsGeneratorOpen,
  setIsSmartGeneratorOpen,
  formTitle,
  formContent,
  formCategory,
  formTags,
  setFormTitle,
  setFormContent,
  setFormCategory,
  setFormTags,
  handleAddPrompt,
  handleEditPrompt,
  handleUseTemplate,
  // Smart generator
  smartConcept,
  smartTask,
  smartFormat,
  smartTone,
  smartDepth,
  smartContext,
  generatedPreview,
  setSmartConcept,
  setSmartTask,
  setSmartFormat,
  setSmartTone,
  setSmartDepth,
  setSmartContext,
  handleSaveSmartPrompt,
  handleCopyGeneratedPrompt,
}: PromptDialogsProps) {
  return (
    <>
      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          setIsEditDialogOpen(open);
          if (!open) {
            // Reset form when closing
            setFormTitle("");
            setFormContent("");
            setFormCategory("general");
            setFormTags("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl glass max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {isEditDialogOpen ? "Editar Prompt" : "Agregar Prompt"}
            </DialogTitle>
            <DialogDescription>
              Crea un prompt reutilizable para tus consultas con IA
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 scrollbar-thin">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="prompt-title">Título</Label>
                <Input
                  id="prompt-title"
                  placeholder="ej. Revisar código Python"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt-content">Contenido del Prompt</Label>
                <Textarea
                  id="prompt-content"
                  placeholder="Escribe tu prompt aquí. Usa {{variable}} para placeholders..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={6}
                  className="font-mono text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Usa dobles llaves para variables, ej: Analiza este código en {"{{lenguaje}}"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt-category">Categoría</Label>
                  <Select
                    value={formCategory}
                    onValueChange={(value) => setFormCategory(value as PromptCategory)}
                  >
                    <SelectTrigger id="prompt-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="coding">Código</SelectItem>
                      <SelectItem value="writing">Escritura</SelectItem>
                      <SelectItem value="analysis">Análisis</SelectItem>
                      <SelectItem value="business">Negocios</SelectItem>
                      <SelectItem value="learning">Aprendizaje</SelectItem>
                      <SelectItem value="creative">Creativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt-tags">Tags (opcional)</Label>
                  <Input
                    id="prompt-tags"
                    placeholder="python, debug, performance"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4 -mx-6 px-6">
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={isEditDialogOpen ? handleEditPrompt : handleAddPrompt}>
              {isEditDialogOpen ? "Actualizar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generator Dialog */}
      <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
        <DialogContent className="sm:max-w-3xl glass max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Plantillas de Prompts
            </DialogTitle>
            <DialogDescription>
              Selecciona una plantilla profesional para empezar
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 scrollbar-thin">
            <div className="grid gap-3 py-4">
              {PROMPT_TEMPLATES.map((template, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => handleUseTemplate(template)}
                  className="text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-medium text-sm">{template.title}</h4>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", CATEGORY_COLORS[template.category])}
                    >
                      {CATEGORY_LABELS[template.category]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 font-mono">
                    {template.content}
                  </p>
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3 h-3" />
                    <span className="text-xs">Usar plantilla</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Smart Generator Dialog */}
      <Dialog open={isSmartGeneratorOpen} onOpenChange={setIsSmartGeneratorOpen}>
        <DialogContent className="sm:max-w-3xl glass max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 via-purple-500 to-blue-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              Generador Inteligente de Prompts
            </DialogTitle>
            <DialogDescription>
              Escribe un concepto y personaliza cómo quieres que la IA lo procese
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 scrollbar-thin">
            <div className="space-y-6 py-4">
              {/* Concept Input */}
              <div className="space-y-2">
                <Label htmlFor="smart-concept" className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  ¿Sobre qué quieres un prompt?
                </Label>
                <Input
                  id="smart-concept"
                  placeholder="ej. Hooks de React, Marketing digital, Machine Learning..."
                  value={smartConcept}
                  onChange={(e) => setSmartConcept(e.target.value)}
                  className="text-base"
                />
              </div>

              {/* Task Type Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  ¿Qué quieres hacer?
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(Object.keys(TASK_LABELS) as TaskType[]).map((task) => (
                    <button
                      key={task}
                      type="button"
                      onClick={() => setSmartTask(task)}
                      className={cn(
                        "p-2 sm:p-3 rounded-lg border-2 transition-all text-left",
                        smartTask === task
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="text-lg sm:text-xl mb-1">{TASK_LABELS[task].icon}</div>
                      <div className="text-xs sm:text-sm font-medium">{TASK_LABELS[task].label}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{TASK_LABELS[task].description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Format */}
                <div className="space-y-2">
                  <Label>📋 Formato de salida</Label>
                  <Select value={smartFormat} onValueChange={(v) => setSmartFormat(v as OutputFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FORMAT_LABELS) as OutputFormat[]).map((format) => (
                        <SelectItem key={format} value={format}>
                          {FORMAT_LABELS[format]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tone */}
                <div className="space-y-2">
                  <Label>🎭 Tono</Label>
                  <Select value={smartTone} onValueChange={(v) => setSmartTone(v as ToneType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TONE_LABELS) as ToneType[]).map((tone) => (
                        <SelectItem key={tone} value={tone}>
                          {TONE_LABELS[tone]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Depth */}
                <div className="space-y-2">
                  <Label>📊 Profundidad</Label>
                  <Select value={smartDepth} onValueChange={(v) => setSmartDepth(v as DepthLevel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DEPTH_LABELS) as DepthLevel[]).map((depth) => (
                        <SelectItem key={depth} value={depth}>
                          {DEPTH_LABELS[depth].label} - {DEPTH_LABELS[depth].description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Additional Context */}
              <div className="space-y-2">
                <Label htmlFor="smart-context">
                  💬 Contexto adicional (opcional)
                </Label>
                <Textarea
                  id="smart-context"
                  placeholder="Añade cualquier contexto específico, restricciones, o detalles..."
                  value={smartContext}
                  onChange={(e) => setSmartContext(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Generated Preview */}
              {generatedPreview && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      Prompt Generado
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyGeneratedPrompt}
                      className="h-7"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4 max-h-[150px] overflow-y-auto scrollbar-thin">
                    <pre className="text-sm whitespace-pre-wrap font-mono">{generatedPreview}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-4 -mx-6 px-6 flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setIsSmartGeneratorOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyGeneratedPrompt}
              disabled={!generatedPreview}
            >
              <Copy className="w-4 h-4 mr-2" />
              Solo copiar
            </Button>
            <Button
              onClick={handleSaveSmartPrompt}
              disabled={!smartConcept.trim() || !generatedPreview}
              className="bg-gradient-to-r from-amber-500 via-purple-500 to-blue-500 text-white hover:opacity-90"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
