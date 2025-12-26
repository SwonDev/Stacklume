"use client";

import { useState, useMemo } from "react";
import {
  Wand2,
  Copy,
  Check,
  Search,
  Filter,
  Link as LinkIcon,
  Code,
  BookOpen,
  Gamepad2,
  Music,
  Play,
  Globe,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  Trash2,
  Package,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLinksStore } from "@/stores/links-store";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";
import type { Link } from "@/lib/db/schema";
import { motion, AnimatePresence } from "motion/react";

interface PromptBuilderWidgetProps {
  widget: Widget;
}

interface SavedPrompt {
  id: string;
  name: string;
  prompt: string;
  linkIds: string[];
  style: string;
  createdAt: string;
}

interface PromptBuilderConfig {
  selectedLinks: string[];
  promptStyle: "integration" | "tutorial" | "comparison" | "setup" | "custom";
  customInstructions: string;
  includeDescriptions: boolean;
  includePlatformInfo: boolean;
  savedPrompts: SavedPrompt[];
}

// Content type icons mapping
const contentTypeIcons: Record<string, typeof Code> = {
  video: Play,
  game: Gamepad2,
  music: Music,
  code: Code,
  article: BookOpen,
  website: Globe,
};

// Technology categories for intelligent prompt generation
const TECH_CATEGORIES: Record<string, { keywords: string[]; type: string; installCmd?: string }> = {
  // Frontend Frameworks
  react: { keywords: ["react", "reactjs", "react.dev"], type: "Frontend Framework", installCmd: "npm install react react-dom" },
  nextjs: { keywords: ["next", "nextjs", "next.js", "vercel"], type: "Full-stack Framework", installCmd: "npx create-next-app@latest" },
  vue: { keywords: ["vue", "vuejs", "vue.js"], type: "Frontend Framework", installCmd: "npm install vue" },
  svelte: { keywords: ["svelte", "sveltekit"], type: "Frontend Framework", installCmd: "npm create svelte@latest" },
  angular: { keywords: ["angular"], type: "Frontend Framework", installCmd: "npm install @angular/core" },

  // CSS/Styling
  tailwind: { keywords: ["tailwind", "tailwindcss"], type: "CSS Framework", installCmd: "npm install tailwindcss" },
  shadcn: { keywords: ["shadcn", "ui.shadcn"], type: "Component Library", installCmd: "npx shadcn@latest init" },

  // State Management
  zustand: { keywords: ["zustand"], type: "State Management", installCmd: "npm install zustand" },
  redux: { keywords: ["redux", "reduxjs"], type: "State Management", installCmd: "npm install @reduxjs/toolkit react-redux" },

  // Backend
  nodejs: { keywords: ["node", "nodejs", "node.js"], type: "Runtime", installCmd: "# Node.js runtime" },
  express: { keywords: ["express", "expressjs"], type: "Backend Framework", installCmd: "npm install express" },
  fastify: { keywords: ["fastify"], type: "Backend Framework", installCmd: "npm install fastify" },

  // Databases
  postgres: { keywords: ["postgres", "postgresql", "neon"], type: "Database", installCmd: "npm install pg" },
  mongodb: { keywords: ["mongo", "mongodb"], type: "Database", installCmd: "npm install mongodb" },
  prisma: { keywords: ["prisma"], type: "ORM", installCmd: "npm install prisma @prisma/client" },
  drizzle: { keywords: ["drizzle"], type: "ORM", installCmd: "npm install drizzle-orm" },

  // APIs & Services
  supabase: { keywords: ["supabase"], type: "BaaS", installCmd: "npm install @supabase/supabase-js" },
  firebase: { keywords: ["firebase"], type: "BaaS", installCmd: "npm install firebase" },
  stripe: { keywords: ["stripe"], type: "Payment API", installCmd: "npm install stripe @stripe/stripe-js" },

  // AI/ML
  openai: { keywords: ["openai", "gpt", "chatgpt"], type: "AI API", installCmd: "npm install openai" },
  anthropic: { keywords: ["anthropic", "claude"], type: "AI API", installCmd: "npm install @anthropic-ai/sdk" },

  // DevOps & Tools
  docker: { keywords: ["docker"], type: "Containerization" },
  vercel: { keywords: ["vercel"], type: "Deployment Platform" },
  github: { keywords: ["github"], type: "Version Control" },

  // Animation
  framer: { keywords: ["framer", "motion"], type: "Animation Library", installCmd: "npm install motion" },
  gsap: { keywords: ["gsap", "greensock"], type: "Animation Library", installCmd: "npm install gsap" },

  // Form & Validation
  zod: { keywords: ["zod"], type: "Validation Library", installCmd: "npm install zod" },
  hookform: { keywords: ["react-hook-form", "hookform"], type: "Form Library", installCmd: "npm install react-hook-form" },
};

// Analyze links and extract technology information
function analyzeTechStack(links: Link[]) {
  const detectedTech: Array<{
    name: string;
    type: string;
    installCmd?: string;
    links: Link[];
  }> = [];

  const techMap = new Map<string, Link[]>();

  links.forEach(link => {
    const searchText = `${link.title} ${link.url} ${link.description || ""} ${link.platform || ""}`.toLowerCase();

    Object.entries(TECH_CATEGORIES).forEach(([techName, techInfo]) => {
      if (techInfo.keywords.some(keyword => searchText.includes(keyword))) {
        if (!techMap.has(techName)) {
          techMap.set(techName, []);
        }
        techMap.get(techName)!.push(link);
      }
    });
  });

  techMap.forEach((techLinks, techName) => {
    const techInfo = TECH_CATEGORIES[techName];
    detectedTech.push({
      name: techName.charAt(0).toUpperCase() + techName.slice(1),
      type: techInfo.type,
      installCmd: techInfo.installCmd,
      links: techLinks,
    });
  });

  return detectedTech;
}

// Intelligent prompt generation
const PROMPT_STYLES = {
  integration: {
    label: "Integrar Stack",
    description: "Prompt inteligente para integrar tecnologias",
    icon: Layers,
    template: (links: Link[], customInstructions: string, includeDescriptions: boolean, _includePlatformInfo: boolean) => {
      const techStack = analyzeTechStack(links);
      const hasBackend = techStack.some(t => ["Backend Framework", "Runtime", "Database", "ORM", "BaaS"].includes(t.type));
      const hasFrontend = techStack.some(t => ["Frontend Framework", "Full-stack Framework", "CSS Framework", "Component Library"].includes(t.type));

      const techByCategory: Record<string, typeof techStack> = {};
      techStack.forEach(tech => {
        if (!techByCategory[tech.type]) {
          techByCategory[tech.type] = [];
        }
        techByCategory[tech.type].push(tech);
      });

      const installCommands = techStack
        .filter(t => t.installCmd && !t.installCmd.startsWith("#"))
        .map(t => t.installCmd)
        .join("\n");

      const resourcesList = links.map(link => {
        let entry = `- **${link.title}**\n  URL: ${link.url}`;
        if (includeDescriptions && link.description) {
          entry += `\n  Descripcion: ${link.description}`;
        }
        return entry;
      }).join("\n\n");

      return `# Integracion de Stack Tecnologico

## Analisis del Stack

${Object.entries(techByCategory).map(([category, techs]) =>
`### ${category}
${techs.map(t => `- **${t.name}**`).join("\n")}`
).join("\n\n")}

## Tipo de Proyecto Detectado
${hasFrontend && hasBackend ? "Full-Stack Application" : hasFrontend ? "Frontend Application" : hasBackend ? "Backend Service" : "General Project"}

## Recursos y Documentacion
${resourcesList}

## Comandos de Instalacion
\`\`\`bash
${installCommands || "# No se detectaron dependencias especificas"}
\`\`\`

## Objetivo
${customInstructions || "Necesito integrar todas estas tecnologias en un proyecto cohesivo siguiendo las mejores practicas."}

## Instrucciones para la IA

### 1. Arquitectura del Proyecto
- Proporciona la estructura de carpetas recomendada
- Explica como organizar los modulos y componentes
- Define las capas de la aplicacion (si aplica)

### 2. Configuracion Inicial
- Archivos de configuracion necesarios (tsconfig, next.config, etc.)
- Variables de entorno requeridas
- Scripts de package.json

### 3. Integracion de Tecnologias
${techStack.map(tech => `- Como configurar e integrar **${tech.name}** (${tech.type})`).join("\n")}

### 4. Codigo de Ejemplo
- Proporciona ejemplos funcionales de cada integracion
- Muestra como conectar las diferentes partes del stack
- Incluye manejo de errores y casos edge

### 5. Mejores Practicas
- Patrones de diseno recomendados para este stack
- Consideraciones de rendimiento
- Seguridad y autenticacion (si aplica)

Por favor, genera una guia completa y detallada paso a paso.`;
    },
  },
  tutorial: {
    label: "Tutorial",
    description: "Genera un tutorial estructurado paso a paso",
    icon: BookOpen,
    template: (links: Link[], customInstructions: string, includeDescriptions: boolean, _includePlatformInfo: boolean) => {
      const techStack = analyzeTechStack(links);

      const resources = links.map(link => {
        let entry = `- **${link.title}**: ${link.url}`;
        if (includeDescriptions && link.description) {
          entry += `\n  > ${link.description}`;
        }
        return entry;
      }).join("\n");

      return `# Tutorial: ${customInstructions || "Implementacion con Stack Seleccionado"}

## Tecnologias Utilizadas
${techStack.map(t => `- **${t.name}** (${t.type})`).join("\n") || "- Varias tecnologias"}

## Recursos de Referencia
${resources}

## Objetivo del Tutorial
${customInstructions || "Crear una implementacion funcional utilizando los recursos proporcionados como referencia."}

## Instrucciones para la IA

Genera un tutorial completo con la siguiente estructura:

### Parte 1: Introduccion
- Que vamos a construir
- Por que estas tecnologias
- Resultado final esperado

### Parte 2: Requisitos Previos
- Conocimientos necesarios
- Software requerido
- Configuracion del entorno

### Parte 3: Configuracion del Proyecto
- Inicializacion paso a paso
- Instalacion de dependencias
- Configuracion basica

### Parte 4: Implementacion
- Desarrollo por etapas
- Codigo explicado linea por linea
- Capturas de pantalla o diagramas cuando sea util

### Parte 5: Funcionalidades Avanzadas
- Mejoras y optimizaciones
- Caracteristicas adicionales
- Personalizacion

### Parte 6: Testing y Despliegue
- Pruebas recomendadas
- Preparacion para produccion
- Opciones de despliegue

### Parte 7: Resumen y Proximos Pasos
- Lo que aprendimos
- Recursos adicionales
- Ideas para expandir

Incluye bloques de codigo completos y funcionales en cada seccion.`;
    },
  },
  comparison: {
    label: "Comparativa",
    description: "Analisis comparativo detallado de alternativas",
    icon: Filter,
    template: (links: Link[], customInstructions: string, includeDescriptions: boolean, includePlatformInfo: boolean) => {
      const items = links.map(link => {
        let entry = `### ${link.title}
- **URL**: ${link.url}`;
        if (includeDescriptions && link.description) {
          entry += `\n- **Descripcion**: ${link.description}`;
        }
        if (includePlatformInfo && link.platform) {
          entry += `\n- **Plataforma/Tipo**: ${link.platform} ${link.contentType ? `(${link.contentType})` : ""}`;
        }
        return entry;
      }).join("\n\n");

      return `# Analisis Comparativo

## Opciones a Evaluar
${items}

## Objetivo de la Comparacion
${customInstructions || "Comparar estas opciones para determinar cual es la mejor eleccion segun diferentes criterios y casos de uso."}

## Instrucciones para la IA

Realiza un analisis comparativo exhaustivo con los siguientes elementos:

### 1. Tabla Comparativa General
| Caracteristica | ${links.map(l => l.title.slice(0, 15)).join(" | ")} |
|----------------|${links.map(() => "---").join("|")}|
| Facilidad de uso | |
| Rendimiento | |
| Documentacion | |
| Comunidad | |
| Precio/Licencia | |
| Curva de aprendizaje | |

### 2. Analisis Detallado de Cada Opcion
Para cada alternativa, analiza:
- Fortalezas principales
- Debilidades o limitaciones
- Casos de uso ideales
- Casos donde NO deberia usarse

### 3. Comparacion por Criterios
- **Rendimiento**: Benchmarks y metricas relevantes
- **Developer Experience**: Facilidad de desarrollo
- **Ecosistema**: Plugins, integraciones, extensiones
- **Soporte y Mantenimiento**: Actualizaciones, issues, responsiveness
- **Escalabilidad**: Como manejan el crecimiento

### 4. Recomendaciones por Escenario
- Para proyectos pequenos/MVPs
- Para aplicaciones enterprise
- Para equipos pequenos vs grandes
- Para diferentes presupuestos

### 5. Conclusion
- Recomendacion principal con justificacion
- Segunda opcion recomendada
- Cuando reconsiderar la decision

Se objetivo y basa el analisis en hechos verificables.`;
    },
  },
  setup: {
    label: "Setup Proyecto",
    description: "Configuracion completa de proyecto desde cero",
    icon: Package,
    template: (links: Link[], customInstructions: string, _includeDescriptions: boolean, _includePlatformInfo: boolean) => {
      const techStack = analyzeTechStack(links);
      const installCommands = techStack
        .filter(t => t.installCmd && !t.installCmd.startsWith("#"))
        .map(t => `# ${t.name}\n${t.installCmd}`)
        .join("\n\n");

      const dependencies = links.map(link => `- ${link.title}: ${link.url}`).join("\n");

      return `# Setup de Proyecto

## Stack Tecnologico
${techStack.map(t => `- **${t.name}** - ${t.type}`).join("\n") || "- Stack personalizado"}

## Recursos de Referencia
${dependencies}

## Objetivo del Proyecto
${customInstructions || "Configurar un proyecto completo desde cero con todas las tecnologias listadas."}

## Instrucciones para la IA

Proporciona una guia completa de configuracion:

### 1. Inicializacion del Proyecto
\`\`\`bash
# Comandos de inicializacion
${installCommands || "npm init -y"}
\`\`\`

### 2. Estructura de Carpetas
\`\`\`
proyecto/
├── src/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── styles/
│   └── ...
├── public/
├── tests/
└── ...
\`\`\`

### 3. Archivos de Configuracion
Proporciona el contenido completo de:
- package.json
- tsconfig.json (si aplica)
- Configuracion del framework principal
- Configuracion de linting y formatting
- .env.example con variables necesarias

### 4. Integracion de Cada Tecnologia
${techStack.map(t => `
#### ${t.name}
- Instalacion: \`${t.installCmd || "ver documentacion"}\`
- Configuracion necesaria
- Archivos a crear/modificar`).join("\n")}

### 5. Scripts de Desarrollo
\`\`\`json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "start": "...",
    "lint": "...",
    "test": "..."
  }
}
\`\`\`

### 6. Verificacion
- Como verificar que todo esta configurado correctamente
- Comando para ejecutar el proyecto
- Troubleshooting de errores comunes

Proporciona todos los archivos completos y listos para copiar.`;
    },
  },
  custom: {
    label: "Personalizado",
    description: "Escribe tu propio prompt con contexto de enlaces",
    icon: Wand2,
    template: (links: Link[], customInstructions: string, includeDescriptions: boolean, includePlatformInfo: boolean) => {
      const techStack = analyzeTechStack(links);

      const linksList = links.map(link => {
        let entry = `- **${link.title}**: ${link.url}`;
        if (includeDescriptions && link.description) {
          entry += `\n  ${link.description}`;
        }
        if (includePlatformInfo && link.platform) {
          entry += `\n  Tipo: ${link.platform}`;
        }
        return entry;
      }).join("\n\n");

      return `# ${customInstructions || "Prompt Personalizado"}

## Contexto Tecnologico
${techStack.length > 0 ? techStack.map(t => `- **${t.name}** (${t.type})`).join("\n") : "- Contexto general"}

## Recursos Disponibles
${linksList}

---

## Instrucciones
${customInstructions || "Escribe aqui tus instrucciones personalizadas para la IA..."}

## Formato de Respuesta Esperado
(Describe como quieres que la IA estructure su respuesta)`;
    },
  },
};

export function PromptBuilderWidget({ widget }: PromptBuilderWidgetProps) {
  const { links, categories } = useLinksStore();
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  const config = (widget.config || {}) as unknown as PromptBuilderConfig;
  const selectedLinkIds = config.selectedLinks || [];
  const promptStyle = config.promptStyle || "integration";
  const customInstructions = config.customInstructions || "";
  const includeDescriptions = config.includeDescriptions !== false;
  const includePlatformInfo = config.includePlatformInfo !== false;
  const savedPrompts = config.savedPrompts || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const [isLinksExpanded, setIsLinksExpanded] = useState(true);
  const [promptName, setPromptName] = useState("");
  const [activeTab, setActiveTab] = useState("build");

  // Get unique platforms from links
  const platforms = useMemo(() => {
    const platformSet = new Set(links.map(l => l.platform).filter(Boolean));
    return Array.from(platformSet) as string[];
  }, [links]);

  // Filter links based on search and filters
  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      const matchesSearch = searchQuery === "" ||
        link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (link.description?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPlatform = filterPlatform === "all" || link.platform === filterPlatform;
      const matchesCategory = filterCategory === "all" || link.categoryId === filterCategory;

      return matchesSearch && matchesPlatform && matchesCategory;
    });
  }, [links, searchQuery, filterPlatform, filterCategory]);

  // Get selected links objects
  const selectedLinks = useMemo(() => {
    return links.filter(link => selectedLinkIds.includes(link.id));
  }, [links, selectedLinkIds]);

  // Generate prompt based on selected style
  const generatedPrompt = useMemo(() => {
    if (selectedLinks.length === 0) return "";
    const styleConfig = PROMPT_STYLES[promptStyle];
    return styleConfig.template(selectedLinks, customInstructions, includeDescriptions, includePlatformInfo);
  }, [selectedLinks, promptStyle, customInstructions, includeDescriptions, includePlatformInfo]);

  const toggleLinkSelection = (linkId: string) => {
    const newSelection = selectedLinkIds.includes(linkId)
      ? selectedLinkIds.filter(id => id !== linkId)
      : [...selectedLinkIds, linkId];

    updateWidget(widget.id, {
      config: { ...config, selectedLinks: newSelection },
    });
  };

  const selectAllFiltered = () => {
    const allFilteredIds = filteredLinks.map(l => l.id);
    const newSelection = [...new Set([...selectedLinkIds, ...allFilteredIds])];
    updateWidget(widget.id, {
      config: { ...config, selectedLinks: newSelection },
    });
  };

  const clearSelection = () => {
    updateWidget(widget.id, {
      config: { ...config, selectedLinks: [] },
    });
  };

  const updateConfig = (updates: Partial<PromptBuilderConfig>) => {
    updateWidget(widget.id, {
      config: { ...config, ...updates },
    });
  };

  const handleCopyPrompt = async () => {
    if (!generatedPrompt) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePrompt = () => {
    if (!promptName.trim() || !generatedPrompt) return;

    const newPrompt: SavedPrompt = {
      id: `prompt-${Date.now()}`,
      name: promptName.trim(),
      prompt: generatedPrompt,
      linkIds: selectedLinkIds,
      style: promptStyle,
      createdAt: new Date().toISOString(),
    };

    updateConfig({
      savedPrompts: [...savedPrompts, newPrompt],
    });
    setPromptName("");
  };

  const handleDeleteSavedPrompt = (promptId: string) => {
    updateConfig({
      savedPrompts: savedPrompts.filter(p => p.id !== promptId),
    });
  };

  const handleLoadSavedPrompt = (savedPrompt: SavedPrompt) => {
    updateConfig({
      selectedLinks: savedPrompt.linkIds,
      promptStyle: savedPrompt.style as PromptBuilderConfig["promptStyle"],
    });
    setActiveTab("build");
  };

  const getIcon = (link: Link) => {
    const IconComponent = contentTypeIcons[link.contentType || "website"] || Globe;
    return IconComponent;
  };

  return (
    <div className="@container h-full w-full overflow-hidden">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 rounded-lg bg-primary/10">
              <Wand2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 text-primary" />
            </div>
            <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
              Prompt Builder
            </h3>
          </div>
          <Badge variant="secondary" className="text-[10px] @sm:text-xs">
            {selectedLinkIds.length} seleccionados
          </Badge>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 h-7 @sm:h-8 flex-shrink-0">
            <TabsTrigger value="build" className="text-[10px] @sm:text-xs">
              Construir
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-[10px] @sm:text-xs">
              Vista Previa
            </TabsTrigger>
            <TabsTrigger value="saved" className="text-[10px] @sm:text-xs">
              Guardados
            </TabsTrigger>
          </TabsList>

          {/* Build Tab */}
          <TabsContent value="build" className="flex-1 min-h-0 mt-2 overflow-hidden">
            <ScrollArea className="h-full pr-2">
              <div className="space-y-3 @sm:space-y-4 pb-2">
                {/* Link Selection */}
                <Collapsible open={isLinksExpanded} onOpenChange={setIsLinksExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between h-7 @sm:h-8 px-2">
                      <span className="flex items-center gap-1.5 text-[10px] @sm:text-xs">
                        <LinkIcon className="w-3 h-3" />
                        Seleccionar Enlaces
                      </span>
                      {isLinksExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {/* Search and Filters */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input
                          placeholder="Buscar enlaces..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-7 @sm:h-8 pl-7 text-[10px] @sm:text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                        <SelectTrigger className="h-7 @sm:h-8 text-[10px] @sm:text-xs flex-1">
                          <SelectValue placeholder="Plataforma" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {platforms.map(platform => (
                            <SelectItem key={platform} value={platform}>
                              {platform}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="h-7 @sm:h-8 text-[10px] @sm:text-xs flex-1">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllFiltered}
                        className="h-6 text-[10px] @sm:text-xs flex-1"
                      >
                        Seleccionar todos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                        className="h-6 text-[10px] @sm:text-xs flex-1"
                        disabled={selectedLinkIds.length === 0}
                      >
                        Limpiar
                      </Button>
                    </div>

                    {/* Links List */}
                    <div className="max-h-[200px] overflow-y-auto rounded-md border p-2 space-y-1">
                      {filteredLinks.length === 0 ? (
                        <p className="text-[10px] @sm:text-xs text-muted-foreground text-center py-4">
                          No hay enlaces disponibles
                        </p>
                      ) : (
                        filteredLinks.map(link => {
                          const Icon = getIcon(link);
                          const isSelected = selectedLinkIds.includes(link.id);
                          return (
                            <motion.div
                              key={link.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-primary/15 border border-primary/40 shadow-sm"
                                  : "hover:bg-secondary/50 border border-transparent"
                              }`}
                              onClick={() => toggleLinkSelection(link.id)}
                            >
                              <div
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground/30 hover:border-primary/50"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                              </div>
                              <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] @sm:text-xs font-medium truncate">
                                  {link.title}
                                </p>
                                {link.platform && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[8px] px-1 py-0 h-3.5 mt-0.5"
                                    style={{
                                      backgroundColor: link.platformColor ? `${link.platformColor}20` : undefined,
                                      color: link.platformColor || undefined,
                                      borderColor: link.platformColor ? `${link.platformColor}40` : undefined
                                    }}
                                  >
                                    {link.platform}
                                  </Badge>
                                )}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Selected Links Preview */}
                {selectedLinkIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedLinks.slice(0, 5).map(link => (
                      <Badge
                        key={link.id}
                        variant="secondary"
                        className="text-[8px] @sm:text-[10px] px-1.5 py-0.5 flex items-center gap-1"
                      >
                        {link.title.slice(0, 15)}{link.title.length > 15 ? "..." : ""}
                        <X
                          className="w-2.5 h-2.5 cursor-pointer hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLinkSelection(link.id);
                          }}
                        />
                      </Badge>
                    ))}
                    {selectedLinkIds.length > 5 && (
                      <Badge variant="outline" className="text-[8px] @sm:text-[10px]">
                        +{selectedLinkIds.length - 5} mas
                      </Badge>
                    )}
                  </div>
                )}

                {/* Prompt Style Selection */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] @sm:text-xs">Estilo de Prompt</Label>
                  <Select
                    value={promptStyle}
                    onValueChange={(value) => updateConfig({ promptStyle: value as PromptBuilderConfig["promptStyle"] })}
                  >
                    <SelectTrigger className="h-7 @sm:h-8 text-[10px] @sm:text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROMPT_STYLES).map(([key, style]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <style.icon className="w-3 h-3" />
                            {style.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] @sm:text-[10px] text-muted-foreground">
                    {PROMPT_STYLES[promptStyle].description}
                  </p>
                </div>

                {/* Custom Instructions */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] @sm:text-xs">Instrucciones Adicionales</Label>
                  <Textarea
                    placeholder="Ej: Quiero crear una app de e-commerce con carrito y pagos..."
                    value={customInstructions}
                    onChange={(e) => updateConfig({ customInstructions: e.target.value })}
                    className="min-h-[60px] @sm:min-h-[80px] text-[10px] @sm:text-xs resize-none"
                  />
                </div>

                {/* Options with proper Switch styling */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-descriptions" className="text-[10px] @sm:text-xs cursor-pointer">
                      Incluir descripciones
                    </Label>
                    <Switch
                      id="include-descriptions"
                      checked={includeDescriptions}
                      onCheckedChange={(checked) => updateConfig({ includeDescriptions: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-platform" className="text-[10px] @sm:text-xs cursor-pointer">
                      Incluir info de plataforma
                    </Label>
                    <Switch
                      id="include-platform"
                      checked={includePlatformInfo}
                      onCheckedChange={(checked) => updateConfig({ includePlatformInfo: checked })}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 min-h-0 flex flex-col gap-2 mt-2 overflow-hidden">
            {selectedLinkIds.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <LinkIcon className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-xs">Selecciona enlaces para generar el prompt</p>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 min-h-0 rounded-md border bg-secondary/30">
                  <pre className="p-3 text-[10px] @sm:text-xs whitespace-pre-wrap font-mono leading-relaxed">
                    {generatedPrompt}
                  </pre>
                </ScrollArea>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    onClick={handleCopyPrompt}
                    className="flex-1 h-7 @sm:h-8 text-[10px] @sm:text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copiar Prompt
                      </>
                    )}
                  </Button>
                </div>

                {/* Save Prompt */}
                <div className="flex gap-2 flex-shrink-0">
                  <Input
                    placeholder="Nombre del prompt..."
                    value={promptName}
                    onChange={(e) => setPromptName(e.target.value)}
                    className="h-7 @sm:h-8 text-[10px] @sm:text-xs flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSavePrompt}
                    disabled={!promptName.trim()}
                    className="h-7 @sm:h-8 text-[10px] @sm:text-xs"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Guardar
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Saved Tab */}
          <TabsContent value="saved" className="flex-1 min-h-0 mt-2 overflow-hidden">
            <ScrollArea className="h-full">
              {savedPrompts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-2 py-8">
                    <Save className="w-8 h-8 mx-auto opacity-50" />
                    <p className="text-xs">No hay prompts guardados</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-1 pr-3">
                  <AnimatePresence mode="popLayout">
                    {savedPrompts.map(savedPrompt => (
                      <motion.div
                        key={savedPrompt.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-2 rounded-md border bg-secondary/30 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] @sm:text-xs font-medium">{savedPrompt.name}</h4>
                          <Badge variant="outline" className="text-[8px]">
                            {PROMPT_STYLES[savedPrompt.style as keyof typeof PROMPT_STYLES]?.label || savedPrompt.style}
                          </Badge>
                        </div>
                        <p className="text-[9px] text-muted-foreground">
                          {savedPrompt.linkIds.length} enlaces - {new Date(savedPrompt.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadSavedPrompt(savedPrompt)}
                            className="h-6 text-[10px] flex-1"
                          >
                            Cargar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await navigator.clipboard.writeText(savedPrompt.prompt);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="h-6 text-[10px]"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSavedPrompt(savedPrompt.id)}
                            className="h-6 text-[10px] text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
