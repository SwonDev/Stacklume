import type { WidgetType, WidgetSize } from './base';
import type { WidgetConfig } from './configs';

// Widget color presets for quick selection
export interface WidgetColorPreset {
  name: string;
  backgroundColor: string;
  accentColor?: string;
  gradient?: string;
}

export const WIDGET_COLOR_PRESETS: WidgetColorPreset[] = [
  { name: 'Default', backgroundColor: '' },
  { name: 'Slate', backgroundColor: 'hsl(215, 20%, 16%)', accentColor: 'hsl(215, 20%, 30%)' },
  { name: 'Zinc', backgroundColor: 'hsl(240, 5%, 16%)', accentColor: 'hsl(240, 5%, 30%)' },
  { name: 'Stone', backgroundColor: 'hsl(20, 10%, 16%)', accentColor: 'hsl(20, 10%, 30%)' },
  { name: 'Red', backgroundColor: 'hsl(0, 40%, 18%)', accentColor: 'hsl(0, 70%, 50%)' },
  { name: 'Orange', backgroundColor: 'hsl(25, 40%, 18%)', accentColor: 'hsl(25, 90%, 55%)' },
  { name: 'Amber', backgroundColor: 'hsl(38, 40%, 18%)', accentColor: 'hsl(38, 90%, 55%)' },
  { name: 'Yellow', backgroundColor: 'hsl(50, 40%, 18%)', accentColor: 'hsl(50, 90%, 55%)' },
  { name: 'Lime', backgroundColor: 'hsl(80, 40%, 15%)', accentColor: 'hsl(80, 80%, 50%)' },
  { name: 'Green', backgroundColor: 'hsl(140, 40%, 15%)', accentColor: 'hsl(140, 70%, 45%)' },
  { name: 'Emerald', backgroundColor: 'hsl(160, 40%, 15%)', accentColor: 'hsl(160, 80%, 45%)' },
  { name: 'Teal', backgroundColor: 'hsl(175, 40%, 15%)', accentColor: 'hsl(175, 70%, 45%)' },
  { name: 'Cyan', backgroundColor: 'hsl(190, 40%, 16%)', accentColor: 'hsl(190, 80%, 50%)' },
  { name: 'Sky', backgroundColor: 'hsl(200, 40%, 18%)', accentColor: 'hsl(200, 90%, 55%)' },
  { name: 'Blue', backgroundColor: 'hsl(220, 40%, 18%)', accentColor: 'hsl(220, 80%, 55%)' },
  { name: 'Indigo', backgroundColor: 'hsl(235, 40%, 18%)', accentColor: 'hsl(235, 70%, 55%)' },
  { name: 'Violet', backgroundColor: 'hsl(260, 40%, 18%)', accentColor: 'hsl(260, 70%, 55%)' },
  { name: 'Purple', backgroundColor: 'hsl(280, 40%, 18%)', accentColor: 'hsl(280, 70%, 55%)' },
  { name: 'Fuchsia', backgroundColor: 'hsl(295, 40%, 18%)', accentColor: 'hsl(295, 80%, 55%)' },
  { name: 'Pink', backgroundColor: 'hsl(330, 40%, 18%)', accentColor: 'hsl(330, 70%, 55%)' },
  { name: 'Rose', backgroundColor: 'hsl(350, 40%, 18%)', accentColor: 'hsl(350, 80%, 55%)' },
  // Gradients
  { name: 'Sunset', backgroundColor: '', gradient: 'linear-gradient(135deg, hsl(0, 60%, 20%) 0%, hsl(40, 70%, 25%) 100%)' },
  { name: 'Ocean', backgroundColor: '', gradient: 'linear-gradient(135deg, hsl(200, 60%, 20%) 0%, hsl(240, 50%, 25%) 100%)' },
  { name: 'Forest', backgroundColor: '', gradient: 'linear-gradient(135deg, hsl(140, 50%, 18%) 0%, hsl(180, 40%, 20%) 100%)' },
  { name: 'Aurora', backgroundColor: '', gradient: 'linear-gradient(135deg, hsl(280, 50%, 20%) 0%, hsl(200, 60%, 25%) 100%)' },
  { name: 'Fire', backgroundColor: '', gradient: 'linear-gradient(135deg, hsl(0, 70%, 25%) 0%, hsl(30, 80%, 30%) 100%)' },
  { name: 'Night', backgroundColor: '', gradient: 'linear-gradient(135deg, hsl(240, 30%, 12%) 0%, hsl(260, 40%, 18%) 100%)' },
];

// Size presets for each widget size
export const WIDGET_SIZE_PRESETS: Record<WidgetSize, { w: number; h: number; minW: number; minH: number }> = {
  small: { w: 1, h: 2, minW: 1, minH: 2 },
  medium: { w: 2, h: 3, minW: 1, minH: 2 },
  large: { w: 2, h: 4, minW: 2, minH: 3 },
  wide: { w: 3, h: 2, minW: 2, minH: 2 },
  tall: { w: 1, h: 4, minW: 1, minH: 3 },
};

// Widget metadata for UI purposes
export interface WidgetTypeMetadata {
  type: WidgetType;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  defaultSize: WidgetSize;
  defaultTitle: string;
  requiresCategory?: boolean; // Whether this widget needs a category to be selected
  requiresTag?: boolean; // Whether this widget needs a tag to be selected
  configurable?: boolean; // Whether this widget has additional config options
}

// Metadata for each widget type
export const WIDGET_TYPE_METADATA: Record<WidgetType, WidgetTypeMetadata> = {
  favorites: {
    type: 'favorites',
    label: 'Favorites',
    description: 'Display your favorite links',
    icon: 'Star',
    defaultSize: 'medium',
    defaultTitle: 'Favorite Links',
    configurable: true,
  },
  recent: {
    type: 'recent',
    label: 'Recent',
    description: 'Show recently added links',
    icon: 'Clock',
    defaultSize: 'medium',
    defaultTitle: 'Recent Links',
    configurable: true,
  },
  category: {
    type: 'category',
    label: 'Category',
    description: 'Display links from a specific category',
    icon: 'Folder',
    defaultSize: 'medium',
    defaultTitle: 'Category Links',
    requiresCategory: true,
    configurable: true,
  },
  tag: {
    type: 'tag',
    label: 'Tag',
    description: 'Display links with a specific tag',
    icon: 'Tag',
    defaultSize: 'medium',
    defaultTitle: 'Tag Links',
    requiresTag: true,
    configurable: true,
  },
  categories: {
    type: 'categories',
    label: 'Categories',
    description: 'Overview of all categories',
    icon: 'FolderTree',
    defaultSize: 'wide',
    defaultTitle: 'All Categories',
    configurable: false,
  },
  'quick-add': {
    type: 'quick-add',
    label: 'Quick Add',
    description: 'Quick link add form',
    icon: 'PlusCircle',
    defaultSize: 'small',
    defaultTitle: 'Quick Add',
    configurable: false,
  },
  stats: {
    type: 'stats',
    label: 'Statistics',
    description: 'Display usage statistics',
    icon: 'BarChart3',
    defaultSize: 'medium',
    defaultTitle: 'Statistics',
    configurable: true,
  },
  'link-analytics': {
    type: 'link-analytics',
    label: 'Analíticas',
    description: 'Estadísticas detalladas de enlaces',
    icon: 'PieChart',
    defaultSize: 'large',
    defaultTitle: 'Analíticas de Enlaces',
    configurable: false,
  },
  clock: {
    type: 'clock',
    label: 'Clock',
    description: 'Display current time',
    icon: 'Clock3',
    defaultSize: 'small',
    defaultTitle: 'Clock',
    configurable: true,
  },
  notes: {
    type: 'notes',
    label: 'Notes',
    description: 'Simple notes widget',
    icon: 'StickyNote',
    defaultSize: 'medium',
    defaultTitle: 'Notes',
    configurable: false,
  },
  progress: {
    type: 'progress',
    label: 'Progress',
    description: 'Track goals and progress',
    icon: 'Target',
    defaultSize: 'medium',
    defaultTitle: 'My Goals',
    configurable: false,
  },
  search: {
    type: 'search',
    label: 'Search',
    description: 'Search through your links',
    icon: 'Search',
    defaultSize: 'medium',
    defaultTitle: 'Search Links',
    configurable: true,
  },
  bookmarks: {
    type: 'bookmarks',
    label: 'Bookmarks',
    description: 'Featured/pinned bookmarks',
    icon: 'Bookmark',
    defaultSize: 'medium',
    defaultTitle: 'Bookmarks',
    configurable: true,
  },
  image: {
    type: 'image',
    label: 'Image',
    description: 'Display a custom image or banner',
    icon: 'Image',
    defaultSize: 'wide',
    defaultTitle: 'Image',
    configurable: true,
  },
  weather: {
    type: 'weather',
    label: 'Weather',
    description: 'Display weather information',
    icon: 'Cloud',
    defaultSize: 'medium',
    defaultTitle: 'Weather',
    configurable: true,
  },
  quote: {
    type: 'quote',
    label: 'Quote',
    description: 'Inspirational daily quotes',
    icon: 'Quote',
    defaultSize: 'medium',
    defaultTitle: 'Quote of the Day',
    configurable: true,
  },
  pomodoro: {
    type: 'pomodoro',
    label: 'Pomodoro',
    description: 'Pomodoro timer for productivity',
    icon: 'Timer',
    defaultSize: 'medium',
    defaultTitle: 'Pomodoro Timer',
    configurable: true,
  },
  calendar: {
    type: 'calendar',
    label: 'Calendar',
    description: 'Simple calendar widget',
    icon: 'Calendar',
    defaultSize: 'medium',
    defaultTitle: 'Calendar',
    configurable: false,
  },
  todo: {
    type: 'todo',
    label: 'Tareas',
    description: 'Lista de tareas con persistencia',
    icon: 'CheckSquare',
    defaultSize: 'medium',
    defaultTitle: 'Mis Tareas',
    configurable: false,
  },
  custom: {
    type: 'custom',
    label: 'Custom',
    description: 'Highly customizable widget with multiple modes',
    icon: 'Sparkles',
    defaultSize: 'medium',
    defaultTitle: 'Custom Widget',
    configurable: true,
  },
  countdown: {
    type: 'countdown',
    label: 'Countdown',
    description: 'Countdown timer to a target date/event',
    icon: 'Timer',
    defaultSize: 'medium',
    defaultTitle: 'Countdown',
    configurable: true,
  },
  'habit-tracker': {
    type: 'habit-tracker',
    label: 'Habit Tracker',
    description: 'Track daily habits with streak visualization',
    icon: 'CheckCircle',
    defaultSize: 'large',
    defaultTitle: 'Habit Tracker',
    configurable: false,
  },
  'tag-cloud': {
    type: 'tag-cloud',
    label: 'Tag Cloud',
    description: 'Interactive cloud visualization of your tags',
    icon: 'Cloud',
    defaultSize: 'medium',
    defaultTitle: 'Tag Cloud',
    configurable: false,
  },
  'random-link': {
    type: 'random-link',
    label: 'Random Link',
    description: 'Discover random links from your collection',
    icon: 'Shuffle',
    defaultSize: 'medium',
    defaultTitle: 'Random Discovery',
    configurable: true,
  },
  'github-activity': {
    type: 'github-activity',
    label: 'Activity',
    description: 'GitHub-style activity grid for your links',
    icon: 'Github',
    defaultSize: 'large',
    defaultTitle: 'Activity',
    configurable: true,
  },
  'bookmark-growth': {
    type: 'bookmark-growth',
    label: 'Growth Chart',
    description: 'Visualize your bookmark collection growth',
    icon: 'TrendingUp',
    defaultSize: 'large',
    defaultTitle: 'Bookmark Growth',
    configurable: false,
  },
  'rss-feed': {
    type: 'rss-feed',
    label: 'RSS Feed',
    description: 'Aggregate and read RSS feeds',
    icon: 'Rss',
    defaultSize: 'large',
    defaultTitle: 'RSS Feeds',
    configurable: true,
  },
  'reading-streak': {
    type: 'reading-streak',
    label: 'Reading Streak',
    description: 'Track your reading activity with a calendar',
    icon: 'Flame',
    defaultSize: 'medium',
    defaultTitle: 'Reading Streak',
    configurable: false,
  },
  'github-trending': {
    type: 'github-trending',
    label: 'GitHub Trending',
    description: 'Discover trending GitHub repositories curated by @tom_doerr',
    icon: 'Sparkles',
    defaultSize: 'large',
    defaultTitle: 'GitHub Trending',
    configurable: true,
  },
  'steam-games': {
    type: 'steam-games',
    label: 'Steam Games',
    description: 'Novedades, próximos lanzamientos y ofertas de Steam',
    icon: 'Gamepad2',
    defaultSize: 'large',
    defaultTitle: 'Steam Games',
    configurable: true,
  },
  'nintendo-deals': {
    type: 'nintendo-deals',
    label: 'Nintendo eShop',
    description: 'Ofertas, novedades y ranking de ventas de la Nintendo eShop',
    icon: 'Gamepad2',
    defaultSize: 'large',
    defaultTitle: 'Nintendo eShop',
    configurable: true,
  },
  'github-search': {
    type: 'github-search',
    label: 'GitHub Search',
    description: 'Busca repositorios de GitHub con filtros y ordenación',
    icon: 'Github',
    defaultSize: 'large',
    defaultTitle: 'GitHub Search',
    configurable: true,
  },
  'codepen': {
    type: 'codepen',
    label: 'CodePen',
    description: 'Embeber snippets de código de CodePen',
    icon: 'Code2',
    defaultSize: 'large',
    defaultTitle: 'CodePen',
    configurable: true,
  },
  'spotify': {
    type: 'spotify',
    label: 'Spotify',
    description: 'Reproducir música de Spotify (tracks, albums, playlists)',
    icon: 'Music',
    defaultSize: 'medium',
    defaultTitle: 'Spotify',
    configurable: true,
  },
  'youtube': {
    type: 'youtube',
    label: 'YouTube',
    description: 'Embeber videos de YouTube',
    icon: 'Play',
    defaultSize: 'large',
    defaultTitle: 'YouTube',
    configurable: true,
  },
  'crypto': {
    type: 'crypto',
    label: 'Crypto',
    description: 'Seguimiento de precios de criptomonedas en tiempo real',
    icon: 'Bitcoin',
    defaultSize: 'medium',
    defaultTitle: 'Crypto Tracker',
    configurable: true,
  },
  'world-clock': {
    type: 'world-clock',
    label: 'Hora Mundial',
    description: 'Muestra la hora en múltiples zonas horarias',
    icon: 'Globe',
    defaultSize: 'medium',
    defaultTitle: 'Hora Mundial',
    configurable: true,
  },
  'color-palette': {
    type: 'color-palette',
    label: 'Paleta de Colores',
    description: 'Guarda y gestiona paletas de colores',
    icon: 'Palette',
    defaultSize: 'medium',
    defaultTitle: 'Mi Paleta',
    configurable: true,
  },
  'unsplash': {
    type: 'unsplash',
    label: 'Unsplash',
    description: 'Fotos aleatorias de Unsplash',
    icon: 'Camera',
    defaultSize: 'wide',
    defaultTitle: 'Unsplash',
    configurable: true,
  },
  'qr-code': {
    type: 'qr-code',
    label: 'Código QR',
    description: 'Genera códigos QR para URLs o texto',
    icon: 'QrCode',
    defaultSize: 'small',
    defaultTitle: 'QR Code',
    configurable: true,
  },
  'website-monitor': {
    type: 'website-monitor',
    label: 'Monitor Web',
    description: 'Monitorea el estado de sitios web',
    icon: 'Globe',
    defaultSize: 'medium',
    defaultTitle: 'Website Monitor',
    configurable: true,
  },
  'embed': {
    type: 'embed',
    label: 'Embed',
    description: 'Embeber cualquier contenido web (iframes, HTML)',
    icon: 'Code',
    defaultSize: 'large',
    defaultTitle: 'Embed',
    configurable: true,
  },
  'prompt': {
    type: 'prompt',
    label: 'Prompts',
    description: 'Almacena y genera prompts para IA',
    icon: 'MessageSquareText',
    defaultSize: 'large',
    defaultTitle: 'Mis Prompts',
    configurable: true,
  },
  'prompt-builder': {
    type: 'prompt-builder',
    label: 'Prompt Builder',
    description: 'Genera prompts con enlaces y stack tecnológico',
    icon: 'Wand2',
    defaultSize: 'large',
    defaultTitle: 'Prompt Builder',
    configurable: true,
  },
  'mcp-explorer': {
    type: 'mcp-explorer',
    label: 'MCP Explorer',
    description: 'Explora servidores MCP para Claude Code',
    icon: 'Puzzle',
    defaultSize: 'large',
    defaultTitle: 'MCP Explorer',
    configurable: true,
  },
  'deployment-status': {
    type: 'deployment-status',
    label: 'Deployments',
    description: 'Estado de deployments en Vercel/Netlify',
    icon: 'Rocket',
    defaultSize: 'large',
    defaultTitle: 'Deployments',
    configurable: true,
  },
  'voice-notes': {
    type: 'voice-notes',
    label: 'Notas de Voz',
    description: 'Graba y transcribe notas de voz',
    icon: 'Mic',
    defaultSize: 'medium',
    defaultTitle: 'Notas de Voz',
    configurable: true,
  },
  'link-manager': {
    type: 'link-manager',
    label: 'Link Manager',
    description: 'Gestiona y organiza todos tus enlaces',
    icon: 'LayoutList',
    defaultSize: 'large',
    defaultTitle: 'Mis Enlaces',
    configurable: true,
  },
  // Social/News Feed Widgets
  'twitter-feed': {
    type: 'twitter-feed',
    label: 'Twitter / X',
    description: 'Visualiza el timeline de un usuario de Twitter/X',
    icon: 'Twitter',
    defaultSize: 'large',
    defaultTitle: 'Twitter Feed',
    configurable: true,
  },
  'reddit': {
    type: 'reddit',
    label: 'Reddit',
    description: 'Lee posts de tus subreddits favoritos',
    icon: 'MessageCircle',
    defaultSize: 'large',
    defaultTitle: 'Reddit',
    configurable: true,
  },
  'hacker-news': {
    type: 'hacker-news',
    label: 'Hacker News',
    description: 'Las mejores historias de Hacker News',
    icon: 'Newspaper',
    defaultSize: 'large',
    defaultTitle: 'Hacker News',
    configurable: true,
  },
  'product-hunt': {
    type: 'product-hunt',
    label: 'Product Hunt',
    description: 'Descubre productos trending en Product Hunt',
    icon: 'Rocket',
    defaultSize: 'large',
    defaultTitle: 'Product Hunt',
    configurable: false,
  },
  'devto-feed': {
    type: 'devto-feed',
    label: 'DEV.to',
    description: 'Articulos de la comunidad DEV.to',
    icon: 'Code',
    defaultSize: 'large',
    defaultTitle: 'DEV.to',
    configurable: true,
  },
  'calculator': {
    type: 'calculator',
    label: 'Calculadora',
    description: 'Calculadora simple para operaciones rápidas',
    icon: 'Calculator',
    defaultSize: 'small',
    defaultTitle: 'Calculadora',
    configurable: false,
  },
  'stopwatch': {
    type: 'stopwatch',
    label: 'Cronómetro',
    description: 'Cronómetro con vueltas y registro de tiempos',
    icon: 'Timer',
    defaultSize: 'small',
    defaultTitle: 'Cronómetro',
    configurable: false,
  },
  'json-formatter': {
    type: 'json-formatter',
    label: 'JSON Formatter',
    description: 'Formatea y valida JSON fácilmente',
    icon: 'Braces',
    defaultSize: 'large',
    defaultTitle: 'JSON Formatter',
    configurable: true,
  },
  'base64-tool': {
    type: 'base64-tool',
    label: 'Base64',
    description: 'Codifica y decodifica texto en Base64',
    icon: 'Binary',
    defaultSize: 'medium',
    defaultTitle: 'Base64 Tool',
    configurable: false,
  },
  'text-tools': {
    type: 'text-tools',
    label: 'Text Tools',
    description: 'Herramientas de manipulación de texto',
    icon: 'Type',
    defaultSize: 'medium',
    defaultTitle: 'Text Tools',
    configurable: false,
  },
  'password-generator': {
    type: 'password-generator',
    label: 'Generador de Contraseñas',
    description: 'Genera contraseñas seguras personalizables',
    icon: 'KeyRound',
    defaultSize: 'medium',
    defaultTitle: 'Password Generator',
    configurable: true,
  },
  'lorem-ipsum': {
    type: 'lorem-ipsum',
    label: 'Lorem Ipsum',
    description: 'Genera texto de relleno Lorem Ipsum',
    icon: 'FileText',
    defaultSize: 'medium',
    defaultTitle: 'Lorem Ipsum',
    configurable: true,
  },
  'dice-roller': {
    type: 'dice-roller',
    label: 'Dados',
    description: 'Lanza dados virtuales de varios tipos',
    icon: 'Dices',
    defaultSize: 'small',
    defaultTitle: 'Dice Roller',
    configurable: false,
  },
  // Developer/Converter widgets
  'unit-converter': {
    type: 'unit-converter',
    label: 'Unit Converter',
    description: 'Convierte entre unidades de medida',
    icon: 'Scale',
    defaultSize: 'medium',
    defaultTitle: 'Unit Converter',
    configurable: true,
  },
  'currency-converter': {
    type: 'currency-converter',
    label: 'Currency Converter',
    description: 'Convierte entre divisas con tasas de cambio',
    icon: 'Coins',
    defaultSize: 'medium',
    defaultTitle: 'Currency Converter',
    configurable: true,
  },
  'markdown-preview': {
    type: 'markdown-preview',
    label: 'Markdown Preview',
    description: 'Editor de Markdown con vista previa en vivo',
    icon: 'FileCode',
    defaultSize: 'large',
    defaultTitle: 'Markdown Editor',
    configurable: true,
  },
  'regex-tester': {
    type: 'regex-tester',
    label: 'Regex Tester',
    description: 'Prueba y depura expresiones regulares',
    icon: 'Regex',
    defaultSize: 'large',
    defaultTitle: 'Regex Tester',
    configurable: true,
  },
  'color-converter': {
    type: 'color-converter',
    label: 'Color Converter',
    description: 'Convierte colores entre formatos (HEX, RGB, HSL)',
    icon: 'Palette',
    defaultSize: 'small',
    defaultTitle: 'Color Converter',
    configurable: true,
  },
  'timezone-converter': {
    type: 'timezone-converter',
    label: 'Timezone Converter',
    description: 'Convierte horarios entre zonas horarias',
    icon: 'Globe',
    defaultSize: 'medium',
    defaultTitle: 'Timezone Converter',
    configurable: true,
  },
  'hash-generator': {
    type: 'hash-generator',
    label: 'Hash Generator',
    description: 'Genera hashes MD5, SHA-1, SHA-256, SHA-512',
    icon: 'Hash',
    defaultSize: 'medium',
    defaultTitle: 'Hash Generator',
    configurable: true,
  },
  'ip-info': {
    type: 'ip-info',
    label: 'IP Info',
    description: 'Muestra información de tu IP y red',
    icon: 'Network',
    defaultSize: 'small',
    defaultTitle: 'IP Info',
    configurable: true,
  },
  // Generator/Calculator widgets
  'uuid-generator': {
    type: 'uuid-generator',
    label: 'UUID Generator',
    description: 'Genera identificadores UUID v1/v4',
    icon: 'Fingerprint',
    defaultSize: 'small',
    defaultTitle: 'UUID Generator',
    configurable: true,
  },
  'number-converter': {
    type: 'number-converter',
    label: 'Number Converter',
    description: 'Convierte entre binario, octal, decimal y hexadecimal',
    icon: 'Binary',
    defaultSize: 'small',
    defaultTitle: 'Number Converter',
    configurable: true,
  },
  'gradient-generator': {
    type: 'gradient-generator',
    label: 'Gradient Generator',
    description: 'Genera gradientes CSS lineales y radiales',
    icon: 'Blend',
    defaultSize: 'medium',
    defaultTitle: 'Gradient Generator',
    configurable: true,
  },
  'box-shadow-generator': {
    type: 'box-shadow-generator',
    label: 'Box Shadow Generator',
    description: 'Genera sombras CSS box-shadow',
    icon: 'Square',
    defaultSize: 'medium',
    defaultTitle: 'Box Shadow',
    configurable: true,
  },
  'clip-path-generator': {
    type: 'clip-path-generator',
    label: 'Clip Path Generator',
    description: 'Generador visual de clip-path CSS para formas personalizadas',
    icon: 'Scissors',
    defaultSize: 'medium',
    defaultTitle: 'Clip Path Generator',
    configurable: true,
  },
  'aspect-ratio': {
    type: 'aspect-ratio',
    label: 'Aspect Ratio',
    description: 'Calculadora de proporción de aspecto',
    icon: 'RectangleHorizontal',
    defaultSize: 'small',
    defaultTitle: 'Aspect Ratio',
    configurable: true,
  },
  'jwt-decoder': {
    type: 'jwt-decoder',
    label: 'JWT Decoder',
    description: 'Decodifica tokens JWT',
    icon: 'Key',
    defaultSize: 'medium',
    defaultTitle: 'JWT Decoder',
    configurable: true,
  },
  'age-calculator': {
    type: 'age-calculator',
    label: 'Age Calculator',
    description: 'Calcula edad desde fecha de nacimiento',
    icon: 'Cake',
    defaultSize: 'small',
    defaultTitle: 'Age Calculator',
    configurable: true,
  },
  'word-counter': {
    type: 'word-counter',
    label: 'Word Counter',
    description: 'Cuenta palabras, caracteres y tiempo de lectura',
    icon: 'FileText',
    defaultSize: 'medium',
    defaultTitle: 'Word Counter',
    configurable: true,
  },
  'svg-wave': {
    type: 'svg-wave',
    label: 'SVG Wave Generator',
    description: 'Generador de ondas SVG para divisores web',
    icon: 'Waves',
    defaultSize: 'medium',
    defaultTitle: 'SVG Wave Generator',
    configurable: true,
  },
  'contrast-checker': {
    type: 'contrast-checker',
    label: 'Contrast Checker',
    description: 'Verifica accesibilidad WCAG de contraste de colores',
    icon: 'Eye',
    defaultSize: 'medium',
    defaultTitle: 'Contrast Checker',
    configurable: false,
  },
  'spacing-calculator': {
    type: 'spacing-calculator',
    label: 'Spacing Calculator',
    description: 'Calculadora de espaciado y escalas para diseño web',
    icon: 'Ruler',
    defaultSize: 'medium',
    defaultTitle: 'Spacing Calculator',
    configurable: true,
  },
  'typography-scale': {
    type: 'typography-scale',
    label: 'Typography Scale',
    description: 'Generate harmonious font size scales for web design',
    icon: 'Type',
    defaultSize: 'medium',
    defaultTitle: 'Typography Scale',
    configurable: true,
  },
  'state-machine': {
    type: 'state-machine',
    label: 'State Machine',
    description: 'Visual game state machine editor with simulation',
    icon: 'GitBranch',
    defaultSize: 'large',
    defaultTitle: 'State Machine Editor',
    configurable: true,
  },
  'easing-functions': {
    type: 'easing-functions',
    label: 'Easing Functions',
    description: 'Interactive easing functions visualizer for game development',
    icon: 'TrendingUp',
    defaultSize: 'large',
    defaultTitle: 'Easing Functions',
    configurable: true,
  },
  'flexbox-playground': {
    type: 'flexbox-playground',
    label: 'Flexbox Playground',
    description: 'CSS Flexbox visual playground for web designers',
    icon: 'LayoutGrid',
    defaultSize: 'large',
    defaultTitle: 'Flexbox Playground',
    configurable: true,
  },
  'neumorphism': {
    type: 'neumorphism',
    label: 'Neumorphism',
    description: 'Generador de efectos Neumorphism (Soft UI)',
    icon: 'Sun',
    defaultSize: 'medium',
    defaultTitle: 'Neumorphism',
    configurable: true,
  },
  'tailwind-colors': {
    type: 'tailwind-colors',
    label: 'Tailwind Colors',
    description: 'Picker de colores de Tailwind CSS',
    icon: 'Palette',
    defaultSize: 'large',
    defaultTitle: 'Tailwind Colors',
    configurable: true,
  },
  'css-filter': {
    type: 'css-filter',
    label: 'CSS Filter',
    description: 'Generador de filtros CSS para imágenes',
    icon: 'ImageIcon',
    defaultSize: 'large',
    defaultTitle: 'CSS Filter',
    configurable: true,
  },
  'css-transform': {
    type: 'css-transform',
    label: 'CSS Transform',
    description: 'Generador de transformaciones CSS 2D/3D',
    icon: 'Move3D',
    defaultSize: 'large',
    defaultTitle: 'CSS Transform',
    configurable: true,
  },
  'css-animation': {
    type: 'css-animation',
    label: 'CSS Animation',
    description: 'Generador de animaciones y keyframes CSS',
    icon: 'Sparkles',
    defaultSize: 'large',
    defaultTitle: 'CSS Animation',
    configurable: true,
  },
  'css-grid': {
    type: 'css-grid',
    label: 'CSS Grid',
    description: 'Generador visual de CSS Grid',
    icon: 'Grid3X3',
    defaultSize: 'large',
    defaultTitle: 'CSS Grid',
    configurable: true,
  },
  'glassmorphism': {
    type: 'glassmorphism',
    label: 'Glassmorphism',
    description: 'Generador de efecto glass/frosted CSS',
    icon: 'Layers',
    defaultSize: 'medium',
    defaultTitle: 'Glassmorphism',
    configurable: true,
  },
  'text-shadow-generator': {
    type: 'text-shadow-generator',
    label: 'Text Shadow',
    description: 'Generador de sombras de texto CSS',
    icon: 'Type',
    defaultSize: 'medium',
    defaultTitle: 'Text Shadow',
    configurable: true,
  },
  'sprite-sheet': {
    type: 'sprite-sheet',
    label: 'Sprite Sheet',
    description: 'Corta sprite sheets y previsualiza animaciones para desarrollo de juegos',
    icon: 'Grid3x3',
    defaultSize: 'large',
    defaultTitle: 'Sprite Sheet Cutter',
    configurable: true,
  },
  'loot-table': {
    type: 'loot-table',
    label: 'Loot Table',
    description: 'Loot table/drop rate calculator for game designers',
    icon: 'Gift',
    defaultSize: 'large',
    defaultTitle: 'Loot Table',
    configurable: true,
  },
  'hitbox-editor': {
    type: 'hitbox-editor',
    label: 'Hitbox Editor',
    description: 'Visual hitbox/collision box editor for game sprites',
    icon: 'Square',
    defaultSize: 'large',
    defaultTitle: 'Hitbox Editor',
    configurable: true,
  },
  'inventory-grid': {
    type: 'inventory-grid',
    label: 'Inventory Grid',
    description: 'Grid-based inventory system designer (Resident Evil 4, Diablo style)',
    icon: 'Package',
    defaultSize: 'large',
    defaultTitle: 'Inventory System',
    configurable: true,
  },
  'pixel-art': {
    type: 'pixel-art',
    label: 'Pixel Art',
    description: 'Pixel art canvas for game asset sketching with animation',
    icon: 'Grid3x3',
    defaultSize: 'large',
    defaultTitle: 'Pixel Art Canvas',
    configurable: true,
  },
  'rpg-stats': {
    type: 'rpg-stats',
    label: 'RPG Stats',
    description: 'RPG stats and damage calculator for game designers',
    icon: 'Sword',
    defaultSize: 'medium',
    defaultTitle: 'RPG Stats Calculator',
    configurable: true,
  },
  'frame-rate': {
    type: 'frame-rate',
    label: 'Frame Rate',
    description: 'Frame rate and time calculator for game optimization',
    icon: 'Gauge',
    defaultSize: 'medium',
    defaultTitle: 'Frame Rate Calculator',
    configurable: true,
  },
  'screen-resolution': {
    type: 'screen-resolution',
    label: 'Screen Resolution',
    description: 'Screen resolution calculator for game developers',
    icon: 'Monitor',
    defaultSize: 'medium',
    defaultTitle: 'Screen Resolution',
    configurable: true,
  },
  'bezier-curve': {
    type: 'bezier-curve',
    label: 'Bezier Curve',
    description: 'Bezier curve editor for game paths and animations',
    icon: 'Spline',
    defaultSize: 'large',
    defaultTitle: 'Bezier Curve Editor',
    configurable: true,
  },
  'color-ramp': {
    type: 'color-ramp',
    label: 'Color Ramp',
    description: 'Color ramp/gradient generator for game art',
    icon: 'Paintbrush',
    defaultSize: 'medium',
    defaultTitle: 'Color Ramp Generator',
    configurable: true,
  },
  'game-math': {
    type: 'game-math',
    label: 'Game Math',
    description: 'Game math reference (vectors, trigonometry, etc.)',
    icon: 'Compass',
    defaultSize: 'medium',
    defaultTitle: 'Game Math Reference',
    configurable: true,
  },
  'noise-generator': {
    type: 'noise-generator',
    label: 'Noise Generator',
    description: 'Procedural noise generator (Perlin, Simplex, etc.)',
    icon: 'Mountain',
    defaultSize: 'large',
    defaultTitle: 'Noise Generator',
    configurable: true,
  },
  'particle-system': {
    type: 'particle-system',
    label: 'Particle System',
    description: 'Particle system designer and previewer',
    icon: 'Sparkles',
    defaultSize: 'large',
    defaultTitle: 'Particle System',
    configurable: true,
  },
  'tilemap-editor': {
    type: 'tilemap-editor',
    label: 'Tilemap Editor',
    description: 'Tilemap/level editor for 2D games',
    icon: 'Map',
    defaultSize: 'large',
    defaultTitle: 'Tilemap Editor',
    configurable: true,
  },
  'input-mapper': {
    type: 'input-mapper',
    label: 'Input Mapper',
    description: 'Game controller input mapping designer with conflict detection',
    icon: 'Gamepad2',
    defaultSize: 'large',
    defaultTitle: 'Input Mapper',
    configurable: true,
  },
  'health-bar': {
    type: 'health-bar',
    label: 'Health Bar',
    description: 'HP/MP/Stamina bar visual designer with animations',
    icon: 'Heart',
    defaultSize: 'large',
    defaultTitle: 'Health Bar Designer',
    configurable: true,
  },
  'behavior-tree': {
    type: 'behavior-tree',
    label: 'Behavior Tree',
    description: 'Visual behavior tree editor for Game AI with simulation',
    icon: 'GitBranch',
    defaultSize: 'large',
    defaultTitle: 'Behavior Tree Editor',
    configurable: true,
  },
  'physics-playground': {
    type: 'physics-playground',
    label: 'Physics Playground',
    description: '2D physics simulation with objects, forces, and constraints',
    icon: 'Atom',
    defaultSize: 'large',
    defaultTitle: 'Physics Playground',
    configurable: true,
  },
  'name-generator': {
    type: 'name-generator',
    label: 'Name Generator',
    description: 'Procedural fantasy/sci-fi name generator with multiple styles',
    icon: 'Wand2',
    defaultSize: 'large',
    defaultTitle: 'Name Generator',
    configurable: true,
  },
  'pathfinding': {
    type: 'pathfinding',
    label: 'Pathfinding',
    description: 'Pathfinding algorithm visualizer (A*, Dijkstra, BFS, DFS)',
    icon: 'Route',
    defaultSize: 'large',
    defaultTitle: 'Pathfinding Visualizer',
    configurable: true,
  },
  'wave-spawner': {
    type: 'wave-spawner',
    label: 'Wave Spawner',
    description: 'Enemy wave pattern designer for game development',
    icon: 'Users',
    defaultSize: 'large',
    defaultTitle: 'Wave Spawner',
    configurable: true,
  },
  'dialogue-tree': {
    type: 'dialogue-tree',
    label: 'Dialogue Tree',
    description: 'Dialogue system editor for RPG conversations',
    icon: 'MessageSquare',
    defaultSize: 'large',
    defaultTitle: 'Dialogue Tree Editor',
    configurable: true,
  },
  'skill-tree': {
    type: 'skill-tree',
    label: 'Skill Tree',
    description: 'Skill tree editor for character progression systems',
    icon: 'Zap',
    defaultSize: 'large',
    defaultTitle: 'Skill Tree Designer',
    configurable: true,
  },
  'camera-shake': {
    type: 'camera-shake',
    label: 'Camera Shake',
    description: 'Camera shake effect designer for game feedback',
    icon: 'Camera',
    defaultSize: 'large',
    defaultTitle: 'Camera Shake Designer',
    configurable: true,
  },
  'damage-calculator': {
    type: 'damage-calculator',
    label: 'Damage Calculator',
    description: 'Damage formula calculator for combat systems',
    icon: 'Calculator',
    defaultSize: 'large',
    defaultTitle: 'Damage Calculator',
    configurable: true,
  },
  'level-progress': {
    type: 'level-progress',
    label: 'Level Progress',
    description: 'Level progression curve designer for experience systems',
    icon: 'TrendingUp',
    defaultSize: 'large',
    defaultTitle: 'Level Progression Designer',
    configurable: true,
  },
  'quest-designer': {
    type: 'quest-designer',
    label: 'Quest Designer',
    description: 'Quest and mission structure designer for RPGs',
    icon: 'Scroll',
    defaultSize: 'large',
    defaultTitle: 'Quest Designer',
    configurable: true,
  },
  'achievement': {
    type: 'achievement',
    label: 'Achievement',
    description: 'Achievement and trophy system designer',
    icon: 'Trophy',
    defaultSize: 'large',
    defaultTitle: 'Achievement System',
    configurable: true,
  },
  // ==========================================
  // Organization & Productivity Widgets
  // ==========================================
  'design-tokens': {
    type: 'design-tokens',
    label: 'Design Tokens',
    description: 'Manage design system tokens (colors, typography, spacing)',
    icon: 'Palette',
    defaultSize: 'large',
    defaultTitle: 'Design Tokens',
    configurable: true,
  },
  'code-snippets': {
    type: 'code-snippets',
    label: 'Code Snippets',
    description: 'Save and organize reusable code snippets',
    icon: 'Code2',
    defaultSize: 'large',
    defaultTitle: 'Code Snippets',
    configurable: true,
  },
  'sprint-tasks': {
    type: 'sprint-tasks',
    label: 'Sprint Tasks',
    description: 'Kanban-style task board for agile workflows',
    icon: 'Kanban',
    defaultSize: 'large',
    defaultTitle: 'Sprint Board',
    configurable: true,
  },
  'decision-log': {
    type: 'decision-log',
    label: 'Decision Log',
    description: 'Track Architecture Decision Records (ADR)',
    icon: 'FileCheck',
    defaultSize: 'large',
    defaultTitle: 'Decision Log',
    configurable: true,
  },
  'eisenhower-matrix': {
    type: 'eisenhower-matrix',
    label: 'Eisenhower Matrix',
    description: 'Priority quadrant matrix (urgent/important)',
    icon: 'LayoutGrid',
    defaultSize: 'large',
    defaultTitle: 'Priority Matrix',
    configurable: false,
  },
  'standup-notes': {
    type: 'standup-notes',
    label: 'Standup Notes',
    description: 'Daily standup notes template',
    icon: 'Users',
    defaultSize: 'medium',
    defaultTitle: 'Daily Standup',
    configurable: false,
  },
  'mood-board': {
    type: 'mood-board',
    label: 'Mood Board',
    description: 'Collect design inspiration with images and notes',
    icon: 'ImagePlus',
    defaultSize: 'large',
    defaultTitle: 'Mood Board',
    configurable: true,
  },
  'api-reference': {
    type: 'api-reference',
    label: 'API Reference',
    description: 'Quick reference for API endpoints',
    icon: 'Server',
    defaultSize: 'large',
    defaultTitle: 'API Reference',
    configurable: true,
  },
  'meeting-notes': {
    type: 'meeting-notes',
    label: 'Meeting Notes',
    description: 'Structured meeting notes with action items',
    icon: 'ClipboardList',
    defaultSize: 'large',
    defaultTitle: 'Meeting Notes',
    configurable: true,
  },
  'weekly-goals': {
    type: 'weekly-goals',
    label: 'Weekly Goals',
    description: 'Track weekly OKRs and goals',
    icon: 'Target',
    defaultSize: 'medium',
    defaultTitle: 'Weekly Goals',
    configurable: true,
  },
  'parking-lot': {
    type: 'parking-lot',
    label: 'Parking Lot',
    description: 'Ideas and features backlog',
    icon: 'Lightbulb',
    defaultSize: 'medium',
    defaultTitle: 'Parking Lot',
    configurable: true,
  },
  'pr-checklist': {
    type: 'pr-checklist',
    label: 'PR Checklist',
    description: 'Pull request review checklist',
    icon: 'GitPullRequest',
    defaultSize: 'medium',
    defaultTitle: 'PR Review',
    configurable: true,
  },
  'tech-debt': {
    type: 'tech-debt',
    label: 'Tech Debt',
    description: 'Track and prioritize technical debt',
    icon: 'AlertTriangle',
    defaultSize: 'large',
    defaultTitle: 'Tech Debt Tracker',
    configurable: true,
  },
  'project-timeline': {
    type: 'project-timeline',
    label: 'Project Timeline',
    description: 'Visualize project milestones and deadlines',
    icon: 'GanttChart',
    defaultSize: 'wide',
    defaultTitle: 'Project Timeline',
    configurable: true,
  },
  'component-docs': {
    type: 'component-docs',
    label: 'Component Docs',
    description: 'Component library documentation reference',
    icon: 'Component',
    defaultSize: 'large',
    defaultTitle: 'Component Library',
    configurable: true,
  },
  'wireframe': {
    type: 'wireframe',
    label: 'Wireframe',
    description: 'Quick wireframing and sketching tool',
    icon: 'PenTool',
    defaultSize: 'large',
    defaultTitle: 'Wireframe',
    configurable: true,
  },
  'design-review': {
    type: 'design-review',
    label: 'Design Review',
    description: 'Design review checklist for quality assurance',
    icon: 'CheckCircle2',
    defaultSize: 'medium',
    defaultTitle: 'Design Review',
    configurable: true,
  },
  'env-vars': {
    type: 'env-vars',
    label: 'Environment Vars',
    description: 'Environment variables reference manager',
    icon: 'Settings2',
    defaultSize: 'medium',
    defaultTitle: 'Environment Variables',
    configurable: true,
  },
  'git-commands': {
    type: 'git-commands',
    label: 'Git Commands',
    description: 'Git commands cheatsheet and quick reference',
    icon: 'GitBranch',
    defaultSize: 'medium',
    defaultTitle: 'Git Cheatsheet',
    configurable: false,
  },
  'shadcn-builder': {
    type: 'shadcn-builder',
    label: 'shadcn/ui Builder',
    description: 'Configura componentes y tema shadcn/ui',
    icon: 'Palette',
    defaultSize: 'large',
    defaultTitle: 'shadcn/ui Builder',
    configurable: true,
  },
  // ==================== NEW WIDGETS METADATA ====================
  // Wellness & Life Tracking
  'mood-tracker': {
    type: 'mood-tracker',
    label: 'Estado de Ánimo',
    description: 'Registro diario de estado emocional con emojis',
    icon: 'Smile',
    defaultSize: 'medium',
    defaultTitle: 'Mi Estado de Ánimo',
    configurable: false,
  },
  'water-intake': {
    type: 'water-intake',
    label: 'Hidratación',
    description: 'Contador de vasos de agua con meta diaria',
    icon: 'Droplets',
    defaultSize: 'small',
    defaultTitle: 'Hidratación',
    configurable: true,
  },
  'sleep-log': {
    type: 'sleep-log',
    label: 'Registro de Sueño',
    description: 'Registro de horas de sueño con tendencias',
    icon: 'Moon',
    defaultSize: 'medium',
    defaultTitle: 'Mi Sueño',
    configurable: false,
  },
  'breathing-exercise': {
    type: 'breathing-exercise',
    label: 'Respiración',
    description: 'Ejercicios de respiración guiados',
    icon: 'Wind',
    defaultSize: 'medium',
    defaultTitle: 'Respiración',
    configurable: true,
  },
  'gratitude-journal': {
    type: 'gratitude-journal',
    label: 'Diario de Gratitud',
    description: 'Registro diario de 3 gratitudes',
    icon: 'Heart',
    defaultSize: 'medium',
    defaultTitle: 'Gratitud',
    configurable: false,
  },
  'daily-affirmations': {
    type: 'daily-affirmations',
    label: 'Afirmaciones',
    description: 'Afirmaciones positivas diarias',
    icon: 'Sparkles',
    defaultSize: 'small',
    defaultTitle: 'Afirmación del Día',
    configurable: false,
  },
  // Finance
  'expense-tracker': {
    type: 'expense-tracker',
    label: 'Gastos',
    description: 'Registro rápido de gastos por categoría',
    icon: 'Receipt',
    defaultSize: 'medium',
    defaultTitle: 'Mis Gastos',
    configurable: true,
  },
  'budget-progress': {
    type: 'budget-progress',
    label: 'Presupuesto',
    description: 'Progreso de presupuesto por categoría',
    icon: 'PieChart',
    defaultSize: 'medium',
    defaultTitle: 'Presupuesto',
    configurable: true,
  },
  'savings-goal': {
    type: 'savings-goal',
    label: 'Metas de Ahorro',
    description: 'Seguimiento de metas de ahorro',
    icon: 'PiggyBank',
    defaultSize: 'medium',
    defaultTitle: 'Mis Ahorros',
    configurable: true,
  },
  'subscription-manager': {
    type: 'subscription-manager',
    label: 'Suscripciones',
    description: 'Gestión de suscripciones y renovaciones',
    icon: 'CreditCard',
    defaultSize: 'medium',
    defaultTitle: 'Suscripciones',
    configurable: true,
  },
  // Advanced Productivity
  'focus-score': {
    type: 'focus-score',
    label: 'Puntuación de Enfoque',
    description: 'Seguimiento de sesiones de concentración',
    icon: 'Target',
    defaultSize: 'small',
    defaultTitle: 'Focus Score',
    configurable: true,
  },
  'time-blocking': {
    type: 'time-blocking',
    label: 'Bloques de Tiempo',
    description: 'Planificación visual del día',
    icon: 'CalendarClock',
    defaultSize: 'large',
    defaultTitle: 'Mi Día',
    configurable: true,
  },
  'daily-review': {
    type: 'daily-review',
    label: 'Revisión Diaria',
    description: 'Resumen del día: logros y mejoras',
    icon: 'ClipboardCheck',
    defaultSize: 'medium',
    defaultTitle: 'Revisión del Día',
    configurable: false,
  },
  'parking-lot-enhanced': {
    type: 'parking-lot-enhanced',
    label: 'Parking Lot+',
    description: 'Ideas y tareas con votación',
    icon: 'Lightbulb',
    defaultSize: 'medium',
    defaultTitle: 'Parking Lot',
    configurable: false,
  },
  'energy-tracker': {
    type: 'energy-tracker',
    label: 'Energía',
    description: 'Niveles de energía durante el día',
    icon: 'Battery',
    defaultSize: 'medium',
    defaultTitle: 'Mi Energía',
    configurable: false,
  },
  // Entertainment & Media
  'movie-tracker': {
    type: 'movie-tracker',
    label: 'Películas',
    description: 'Seguimiento de películas y series',
    icon: 'Film',
    defaultSize: 'medium',
    defaultTitle: 'Mis Películas',
    configurable: false,
  },
  'book-tracker': {
    type: 'book-tracker',
    label: 'Libros',
    description: 'Seguimiento de lecturas',
    icon: 'BookOpen',
    defaultSize: 'medium',
    defaultTitle: 'Mis Libros',
    configurable: true,
  },
  'anime-list': {
    type: 'anime-list',
    label: 'Anime/Manga',
    description: 'Seguimiento de anime y manga',
    icon: 'Tv',
    defaultSize: 'medium',
    defaultTitle: 'Mi Anime',
    configurable: false,
  },
  'game-backlog': {
    type: 'game-backlog',
    label: 'Juegos',
    description: 'Backlog de videojuegos',
    icon: 'Gamepad2',
    defaultSize: 'medium',
    defaultTitle: 'Mi Backlog',
    configurable: false,
  },
  'wishlist': {
    type: 'wishlist',
    label: 'Lista de Deseos',
    description: 'Wishlist con precios y enlaces',
    icon: 'Gift',
    defaultSize: 'medium',
    defaultTitle: 'Mi Wishlist',
    configurable: true,
  },
  // AI & Intelligence
  'ai-chat': {
    type: 'ai-chat',
    label: 'Chat IA',
    description: 'Chat con inteligencia artificial',
    icon: 'Bot',
    defaultSize: 'large',
    defaultTitle: 'Asistente IA',
    configurable: false,
  },
  'ai-daily-summary': {
    type: 'ai-daily-summary',
    label: 'Resumen IA',
    description: 'Resumen diario de tu actividad',
    icon: 'Wand2',
    defaultSize: 'medium',
    defaultTitle: 'Resumen del Día',
    configurable: false,
  },
  'smart-suggestions': {
    type: 'smart-suggestions',
    label: 'Sugerencias',
    description: 'Links recomendados para ti',
    icon: 'Sparkles',
    defaultSize: 'medium',
    defaultTitle: 'Para Ti',
    configurable: false,
  },
  // Additional Social & News widget (reddit-widget alternative)
  'reddit-widget': {
    type: 'reddit-widget',
    label: 'Reddit Widget',
    description: 'Posts de subreddits (widget alternativo)',
    icon: 'MessageCircle',
    defaultSize: 'medium',
    defaultTitle: 'Reddit Widget',
    configurable: true,
  },
  // Design & Creativity
  'color-of-day': {
    type: 'color-of-day',
    label: 'Color del Día',
    description: 'Color destacado con paletas',
    icon: 'Palette',
    defaultSize: 'small',
    defaultTitle: 'Color del Día',
    configurable: false,
  },
  'font-pairing': {
    type: 'font-pairing',
    label: 'Tipografías',
    description: 'Combinaciones de fuentes',
    icon: 'Type',
    defaultSize: 'medium',
    defaultTitle: 'Font Pairing',
    configurable: false,
  },
  'design-inspiration': {
    type: 'design-inspiration',
    label: 'Inspiración',
    description: 'Inspiración de diseño aleatoria',
    icon: 'Image',
    defaultSize: 'medium',
    defaultTitle: 'Inspiración',
    configurable: false,
  },
  'icon-picker': {
    type: 'icon-picker',
    label: 'Iconos',
    description: 'Buscador de iconos Lucide',
    icon: 'Search',
    defaultSize: 'medium',
    defaultTitle: 'Iconos',
    configurable: false,
  },
  'screenshot-mockup': {
    type: 'screenshot-mockup',
    label: 'Mockups',
    description: 'Generador de mockups rápidos',
    icon: 'Smartphone',
    defaultSize: 'large',
    defaultTitle: 'Mockup Generator',
    configurable: true,
  },
  // Utility (new)
  'clipboard-history': {
    type: 'clipboard-history',
    label: 'Portapapeles',
    description: 'Historial de portapapeles',
    icon: 'Clipboard',
    defaultSize: 'medium',
    defaultTitle: 'Clipboard',
    configurable: true,
  },
  'sticky-notes': {
    type: 'sticky-notes',
    label: 'Notas Adhesivas',
    description: 'Post-its coloridos',
    icon: 'StickyNote',
    defaultSize: 'medium',
    defaultTitle: 'Sticky Notes',
    configurable: false,
  },
  'link-previewer': {
    type: 'link-previewer',
    label: 'Preview URL',
    description: 'Vista previa de URLs',
    icon: 'Link',
    defaultSize: 'medium',
    defaultTitle: 'Link Preview',
    configurable: false,
  },
  'site-status': {
    type: 'site-status',
    label: 'Estado de Sitios',
    description: 'Monitor de uptime multi-sitio',
    icon: 'Activity',
    defaultSize: 'medium',
    defaultTitle: 'Site Status',
    configurable: true,
  },
  'api-tester': {
    type: 'api-tester',
    label: 'API Tester',
    description: 'Pruebas rápidas de API REST',
    icon: 'Terminal',
    defaultSize: 'large',
    defaultTitle: 'API Tester',
    configurable: false,
  },
  'cron-builder': {
    type: 'cron-builder',
    label: 'Cron Builder',
    description: 'Constructor de expresiones cron',
    icon: 'Clock',
    defaultSize: 'medium',
    defaultTitle: 'Cron Builder',
    configurable: false,
  },
  'diff-viewer': {
    type: 'diff-viewer',
    label: 'Diff Viewer',
    description: 'Comparador de textos',
    icon: 'GitCompare',
    defaultSize: 'large',
    defaultTitle: 'Diff Viewer',
    configurable: true,
  },
  'password-manager': {
    type: 'password-manager',
    label: 'Gestor de Contraseñas',
    description: 'Almacena y gestiona logins, usuarios y contraseñas con acceso a las webs',
    icon: 'KeyRound',
    defaultSize: 'large',
    defaultTitle: 'Contraseñas',
    configurable: false,
  },
};

// Type alias for WidgetConfig - used for functions that return widget configs
export type WidgetConfigOptions = WidgetConfig;

// Helper function to get default config for a widget type
export function getDefaultWidgetConfig(type: WidgetType): WidgetConfigOptions {
  switch (type) {
    case 'favorites':
    case 'recent':
      return {
        limit: 6,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        showImages: true,
        showDescriptions: true,
      };

    case 'category':
      return {
        limit: 8,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        showImages: true,
        showDescriptions: false,
      };

    case 'tag':
      return {
        limit: 8,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        showImages: true,
        showDescriptions: false,
      };

    case 'clock':
      return {
        format24Hour: false,
        showDate: true,
        showSeconds: true,
      };

    case 'stats':
      return {
        statTypes: ['total', 'categories', 'tags', 'favorites'],
        displayMode: 'compact',
      };

    case 'link-analytics':
      return {};

    case 'notes':
      return {
        noteContent: '',
      };

    case 'progress':
      return {
        goals: [],
      };

    case 'search':
      return {
        limit: 10,
        searchPlaceholder: 'Buscar enlaces...',
      };

    case 'bookmarks':
      return {
        bookmarkedLinkIds: [],
        bookmarksViewMode: 'grid',
      };

    case 'image':
      return {
        imageUrl: '',
        linkUrl: '',
        caption: '',
        objectFit: 'cover',
        showCaption: true,
      };

    case 'weather':
      return {
        location: '',
        useGeolocation: false,
        showApiHint: true,
      };

    case 'quote':
      return {
        category: 'all',
        currentQuoteIndex: 0,
        favorites: [],
      };

    case 'pomodoro':
      return {
        workDuration: 25,
        breakDuration: 5,
        soundEnabled: true,
      };

    case 'calendar':
      return {};

    case 'todo':
      return {
        todoItems: [],
        showCompletedTodos: true,
      };

    case 'custom':
      return {
        customMode: 'links',
        customBackground: '',
        customTextColor: '',
        customLinks: [],
        customText: '',
        countdownDate: '',
        countdownTitle: 'Countdown',
        countdownShowTime: true,
        embedUrl: '',
        embedHeight: '400px',
        galleryImages: [],
        galleryLayout: 'grid',
        checklistItems: [],
      };

    case 'countdown':
      return {
        targetDate: '',
        eventName: 'My Event',
      };

    case 'habit-tracker':
      return {
        habits: [],
      };

    case 'tag-cloud':
      return {};

    case 'random-link':
      return {
        autoShuffle: false,
        shuffleInterval: 30,
        filterCategoryId: undefined,
      };

    case 'github-activity':
      return {
        githubUsername: '',
        showProfile: true,
      };

    case 'bookmark-growth':
      return {};

    case 'rss-feed':
      return {
        feedUrls: [],
        refreshInterval: 30,
        maxItems: 10,
      };

    case 'reading-streak':
      return {
        activityLog: [],
      };

    case 'github-trending':
      return {
        maxItems: 50,
      };

    case 'steam-games':
      return {
        maxItems: 10,
      };

    case 'nintendo-deals':
      return {
        region: 'ES',
        maxItems: 30,
      };

    case 'github-search':
      return {
        defaultSort: 'stars',
        defaultLanguage: '',
      };

    case 'codepen':
      return {
        penUrl: '',
        codepenTheme: 'dark',
        defaultTab: 'result',
        editable: false,
        showResult: true,
      };

    case 'spotify':
      return {
        spotifyUrl: '',
        spotifyTheme: '0',
        compact: false,
      };

    case 'youtube':
      return {
        videoUrl: '',
        autoplay: false,
        muted: false,
        loop: false,
        controls: true,
        startTime: 0,
      };

    case 'crypto':
      return {
        coins: ['bitcoin', 'ethereum'],
        currency: 'usd',
        refreshInterval: 60,
      };

    case 'world-clock':
      return {
        timezones: [],
        format24Hour: false,
        showSeconds: false,
        showDate: true,
      };

    case 'color-palette':
      return {
        palettes: [],
        activePaletteId: '',
      };

    case 'unsplash':
      return {
        query: '',
        orientation: 'landscape',
        autoRefresh: false,
        refreshInterval: 30,
        showInfo: true,
      };

    case 'qr-code':
      return {
        content: '',
        size: 200,
        fgColor: '#000000',
        bgColor: '#FFFFFF',
        errorCorrectionLevel: 'M',
      };

    case 'website-monitor':
      return {
        websites: [],
        refreshInterval: 60,
      };

    case 'embed':
      return {
        embedType: 'url',
        embedUrl: '',
        embedHtml: '',
        title: 'Embedded Content',
        allowFullscreen: true,
      };

    case 'prompt':
      return {
        prompts: [],
        selectedCategory: 'all',
        promptViewMode: 'list',
        sortBy: 'createdAt',
        showFavoritesOnly: false,
        generatorTemplates: [],
      };

    case 'prompt-builder':
      return {
        selectedLinks: [],
        promptStyle: 'integration',
        customInstructions: '',
        includeDescriptions: true,
        includePlatformInfo: true,
        savedPrompts: [],
      };

    case 'mcp-explorer':
      return {
        mcpCategory: 'all',
        mcpSearchQuery: '',
        mcpViewMode: 'grid',
        mcpSortBy: 'stars',
        mcpFavorites: [],
        mcpShowOnlyFavorites: false,
      };

    case 'deployment-status':
      return {
        deployProvider: undefined,
        deployConnected: false,
        deployProjects: [],
        deploySelectedProjectIds: [],
        deployMaxItems: 10,
        deployAutoRefresh: true,
        deployRefreshInterval: 60,
      };

    case 'voice-notes':
      return {
        voiceNotes: [],
        voiceLanguage: 'es-ES',
        voiceAutoSave: true,
        voiceContinuousMode: true,
        voiceShowTranscript: true,
      };

    case 'link-manager':
      return {
        linkManagerViewMode: 'list',
        linkManagerShowImages: true,
        linkManagerShowDescriptions: false,
        linkManagerFilterCategoryId: null,
        linkManagerFilterTagIds: [],
        linkManagerFilterFavoritesOnly: false,
        linkManagerSortBy: 'createdAt',
        linkManagerSortOrder: 'desc',
        linkManagerEnableBulkSelection: true,
        linkManagerEnableDragReorder: true,
      };

    case 'calculator':
      return {
        lastResult: '0',
        history: [],
        scientificMode: false,
      };

    case 'stopwatch':
      return {
        laps: [],
        savedTime: 0,
      };

    case 'json-formatter':
      return {
        jsonContent: '',
        indentSize: 2,
        sortKeys: false,
      };

    case 'base64-tool':
      return {
        inputText: '',
        outputText: '',
        lastMode: 'encode',
      };

    case 'text-tools':
      return {
        textContent: '',
        lastTool: 'uppercase',
      };

    case 'password-generator':
      return {
        passwordLength: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeAmbiguous: true,
        customSymbols: '!@#$%^&*',
        generatedPasswords: [],
      };

    case 'lorem-ipsum':
      return {
        paragraphCount: 3,
        wordCount: 50,
        generationType: 'paragraphs',
        startWithLorem: true,
      };

    case 'dice-roller':
      return {
        diceType: 6,
        diceCount: 1,
        modifier: 0,
        rollHistory: [],
      };

    case 'unit-converter':
      return {
        unitCategory: 'length',
        lastFromUnit: 'meter',
        lastToUnit: 'feet',
        lastValue: 1,
      };

    case 'currency-converter':
      return {
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        lastAmount: 100,
        favoritePairs: [],
      };

    case 'markdown-preview':
      return {
        markdownContent: '# Hello Markdown\n\nStart writing here...',
        previewMode: 'split',
        fontSize: 14,
      };

    case 'regex-tester':
      return {
        pattern: '',
        flags: 'g',
        testString: '',
        savedPatterns: [],
      };

    case 'color-converter':
      return {
        colorFormat: 'hex',
        lastColor: '#3b82f6',
        savedColors: [],
      };

    case 'timezone-converter':
      return {
        sourceTimezone: 'UTC',
        targetTimezones: ['America/New_York', 'Europe/London', 'Asia/Tokyo'],
        use24Hour: false,
      };

    case 'hash-generator':
      return {
        hashAlgorithm: 'sha256',
        lastInput: '',
        hashHistory: [],
      };

    case 'ip-info':
      return {
        showIPv6: true,
        showNetworkInfo: true,
        autoRefresh: false,
      };

    case 'uuid-generator':
      return {
        uuidVersion: 'v4',
        uppercase: false,
        includeHyphens: true,
        history: [],
      };

    case 'number-converter':
      return {
        inputBase: 'decimal',
        inputValue: '',
      };

    case 'gradient-generator':
      return {
        gradientType: 'linear',
        angle: 90,
        colors: [
          { color: '#3B82F6', position: 0 },
          { color: '#8B5CF6', position: 100 },
        ],
      };

    case 'box-shadow-generator':
      return {
        offsetX: 4,
        offsetY: 4,
        blurRadius: 10,
        spreadRadius: 0,
        color: '#00000040',
        inset: false,
      };

    case 'clip-path-generator':
      return {
        clipPathShape: 'circle',
        clipPathUnit: '%',
        clipPathCircleRadius: 50,
        clipPathCircleX: 50,
        clipPathCircleY: 50,
        clipPathEllipseRx: 50,
        clipPathEllipseRy: 35,
        clipPathInsetTop: 10,
        clipPathInsetRight: 10,
        clipPathInsetBottom: 10,
        clipPathInsetLeft: 10,
        clipPathInsetRadius: 20,
        clipPathPolygonPoints: [
          { x: 50, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
        clipPathBackgroundImage: '',
        clipPathUseImage: false,
      };

    case 'aspect-ratio':
      return {
        width: 1920,
        height: 1080,
      };

    case 'jwt-decoder':
      return {
        lastToken: '',
        showRaw: false,
      };

    case 'age-calculator':
      return {
        birthDate: '',
        showDays: true,
        showWeeks: true,
      };

    case 'word-counter':
      return {
        text: '',
        showReadingTime: true,
        wordsPerMinute: 200,
      };

    case 'svg-wave':
      return {
        waveType: 'sine',
        peaks: 2,
        height: 100,
        amplitude: 40,
        complexity: 1,
        flipVertical: false,
        flipHorizontal: false,
        color1: '#3B82F6',
        color2: '#8B5CF6',
        useGradient: false,
        opacity: 1,
        position: 'bottom',
        previewBg: '#F1F5F9',
      };

    case 'text-shadow-generator':
      return {
        textShadowLayers: [
          {
            id: `shadow-${Date.now()}`,
            offsetX: 2,
            offsetY: 2,
            blur: 4,
            color: '#000000',
            opacity: 0.5,
          },
        ],
        textShadowTextStyle: {
          sampleText: 'Text Shadow',
          fontSize: 48,
          textColor: '#ffffff',
          fontWeight: '700',
          backgroundColor: '#1a1a1a',
        },
      };

    case 'contrast-checker':
      return {
        foregroundColor: '#000000',
        backgroundColor: '#FFFFFF',
      };

    case 'spacing-calculator':
      return {
        spacingBaseUnit: 4,
        spacingUse8pxBase: false,
        spacingCustomMultiplier: 1,
      };

    case 'typography-scale':
      return {
        typographyBaseSize: 16,
        typographyRatio: 1.25,
        typographyCustomRatio: 1.25,
        typographySteps: 8,
      };

    case 'state-machine':
      return {
        stateMachine: {
          states: [],
          transitions: [],
          initialStateId: null,
          currentStateId: null,
        },
      };

    case 'easing-functions':
      return {
        selectedEasing: 'easeInOutQuad',
        compareEasing: 'easeInOutCubic',
        duration: 1000,
        compareMode: false,
      };

    case 'css-transform':
      return {
        transformConfig: {
          rotate: 0,
          rotateX: 0,
          rotateY: 0,
          rotateZ: 0,
          scale: 1,
          scaleX: 1,
          scaleY: 1,
          translateX: 0,
          translateY: 0,
          skewX: 0,
          skewY: 0,
          transformOrigin: 'center',
          perspective: 1000,
          enable3D: false,
        },
      };

    case 'flexbox-playground':
      return {
        flexboxConfig: {
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          flexWrap: 'nowrap',
          gap: 8,
          itemCount: 4,
        },
      };

    case 'neumorphism':
      return {
        neumorphismConfig: {
          backgroundColor: '#e0e5ec',
          shadowDistance: 15,
          blurAmount: 30,
          shadowIntensity: 0.15,
          borderRadius: 20,
          elementSize: 120,
          shapeType: 'flat',
          lightDirection: 'top-left',
          previewShape: 'square',
        },
      };

    case 'tailwind-colors':
      return {
        classType: 'bg',
        recentColors: [],
        tailwindFavoriteColors: [],
        searchQuery: '',
      };

    case 'css-filter':
      return {
        filterConfig: {
          blur: 0,
          brightness: 100,
          contrast: 100,
          grayscale: 0,
          hueRotate: 0,
          invert: 0,
          opacity: 100,
          saturate: 100,
          sepia: 0,
        },
      };

    case 'css-animation':
      return {
        animationConfig: {
          presetAnimation: 'fade-in',
          duration: 1,
          timingFunction: 'ease',
          delay: 0,
          iterationCount: 1,
          direction: 'normal',
          fillMode: 'forwards',
        },
      };

    case 'css-grid':
      return {
        gridConfig: {
          templateColumns: 'repeat(3, 1fr)',
          templateRows: 'repeat(3, 100px)',
          gap: 16,
          justifyItems: 'stretch',
          alignItems: 'stretch',
        },
      };

    case 'sprite-sheet':
      return {
        spriteImageUrl: '',
        spriteGridMode: 'rows-cols',
        spriteRows: 1,
        spriteCols: 1,
        spriteFrameWidth: 32,
        spriteFrameHeight: 32,
        spriteOffsetX: 0,
        spriteOffsetY: 0,
        spritePaddingX: 0,
        spritePaddingY: 0,
      };

    case 'pixel-art':
      return {
        pixelData: Array(16).fill(null).map(() => Array(16).fill('transparent')),
        pixelGridSize: 16,
        pixelZoom: 1,
        pixelRecentColors: ['#000000', '#ffffff'],
        pixelFrames: [{ id: 'frame-1', data: Array(16).fill(null).map(() => Array(16).fill('transparent')) }],
        pixelFps: 8,
        pixelPaletteMode: 'custom',
      };

    case 'rpg-stats':
      return {};

    case 'frame-rate':
      return {};

    case 'screen-resolution':
      return {
        screenWidth: 1920,
        screenHeight: 1080,
        targetAspectRatio: '16:9',
        dpi: 96,
      };

    case 'bezier-curve':
      return {
        bezierCurveType: 'cubic',
        bezierPoints: [{ x: 0, y: 100 }, { x: 33, y: 67 }, { x: 67, y: 33 }, { x: 100, y: 0 }],
        bezierShowGrid: true,
        bezierSnapToGrid: true,
        bezierShowHandles: true,
        bezierShowTangents: false,
        bezierSampleCount: 50,
      };

    case 'color-ramp':
      return {};

    case 'game-math':
      return {};

    case 'noise-generator':
      return {};

    case 'particle-system':
      return {
        particleConfig: {
          emissionRate: 100,
          maxParticles: 1000,
          lifetime: 2,
          speed: 100,
          direction: 0,
          spreadAngle: 360,
        },
      };

    case 'tilemap-editor':
      return {
        tilemapGridSize: 16,
        tilemapTileSize: 32,
      };

    case 'input-mapper':
      return {
        inputMapperActions: [],
        inputMapperBindings: [],
        inputMapperSelectedController: 'xbox',
        inputMapperShowConflicts: true,
        inputMapperDeadZoneGlobal: 0.2,
        inputMapperSensitivityGlobal: 1,
        inputMapperPreviewMode: false,
        inputMapperHighlightedAction: null,
      };

    case 'loot-table':
      return {
        lootTables: [],
      };

    case 'hitbox-editor':
      return {
        hitboxSpriteUrl: '',
        hitboxFrames: [
          { id: 'frame-1', name: 'Frame 1', hitboxes: [] }
        ],
        hitboxZoom: 1,
      };

    case 'behavior-tree':
      return {
        behaviorTree: {
          nodes: [],
          rootId: null,
          blackboard: {},
        },
      };

    case 'dialogue-tree':
      return {
        dialogueTree: {
          nodes: [],
          connections: [],
          variables: [],
          startNodeId: null,
        },
      };

    case 'physics-playground':
      return {
        physicsObjects: [],
        physicsConstraints: [],
        physicsWorldSettings: {
          gravity: { x: 0, y: 98 },
          airResistance: 0.01,
          timeScale: 1,
          showVelocityVectors: false,
          showForceVectors: false,
          showCollisions: true,
          showTrails: false,
          showGround: true,
          showWalls: true,
          showConstraints: true,
          showGrid: false,
        },
      };

    case 'pathfinding':
      return {
        pathfindingGridSize: 20,
        pathfindingAlgorithm: 'astar',
        pathfindingHeuristic: 'manhattan',
        pathfindingSpeed: 50,
        pathfindingAllowDiagonal: true,
      };

    case 'wave-spawner':
      return {
        enemyTypes: [],
        waves: [],
        activeWaveId: undefined,
        selectedPreset: undefined,
      };

    case 'level-progress':
      return {
        levelProgressConfig: {
          type: 'exponential',
          baseXP: 100,
          scalingFactor: 1.5,
          maxLevel: 100,
          customPoints: [],
        },
        statGains: [
          { id: '1', name: 'HP', baseValue: 100, perLevel: 10, scalingType: 'linear', scalingFactor: 1.0 },
          { id: '2', name: 'ATK', baseValue: 10, perLevel: 2, scalingType: 'linear', scalingFactor: 1.0 },
          { id: '3', name: 'DEF', baseValue: 5, perLevel: 1, scalingType: 'linear', scalingFactor: 1.0 },
        ],
        levelMilestones: [
          { level: 10, name: 'Apprentice', reward: 'Skill Unlock' },
          { level: 25, name: 'Expert', reward: 'Rare Item' },
          { level: 50, name: 'Master', reward: 'Epic Weapon' },
          { level: 100, name: 'Legend', reward: 'Legendary Title' },
        ],
        prestigeConfig: {
          enabled: false,
          bonusPerPrestige: 10,
          maxPrestiges: 10,
          currentPrestige: 0,
        },
      };

    // ==========================================
    // Organization & Productivity Widget Configs
    // ==========================================
    case 'design-tokens':
      return {
        tokens: {
          colors: [],
          typography: [],
          spacing: [],
          shadows: [],
          radii: [],
        },
        activeTab: 'colors',
        exportFormat: 'css',
      };

    case 'code-snippets':
      return {
        snippets: [],
        selectedSnippetId: undefined,
        filterLanguage: undefined,
        filterTag: undefined,
        snippetSortBy: 'createdAt',
      };

    case 'sprint-tasks':
      return {
        sprint: {
          name: 'Sprint 1',
          goal: '',
        },
        columns: [
          { id: 'backlog', name: 'Backlog' },
          { id: 'todo', name: 'To Do' },
          { id: 'in-progress', name: 'In Progress', wipLimit: 3 },
          { id: 'done', name: 'Done' },
        ],
        tasks: [],
      };

    case 'decision-log':
      return {
        decisions: [],
        decisionFilterStatus: 'all',
        decisionSortBy: 'date',
      };

    case 'eisenhower-matrix':
      return {
        tasks: [],
        showCompleted: false,
      };

    case 'standup-notes':
      return {
        standups: [],
        teamMembers: [],
      };

    case 'mood-board':
      return {
        moodBoardItems: [],
        boardName: 'My Mood Board',
        backgroundColor: '#ffffff',
        showGrid: true,
        zoom: 1,
      };

    case 'api-reference':
      return {
        endpoints: [],
        baseUrl: '',
        filterMethod: 'all',
      };

    case 'meeting-notes':
      return {
        meetings: [],
        selectedMeetingId: undefined,
        meetingSortBy: 'date',
      };

    case 'weekly-goals':
      return {
        weeks: [],
        currentWeekId: undefined,
      };

    case 'parking-lot':
      return {
        ideas: [],
        filterCategory: undefined,
        ideaFilterStatus: undefined,
        ideaSortBy: 'priority',
      };

    case 'pr-checklist':
      return {
        templates: [
          {
            id: 'default',
            name: 'Default PR Checklist',
            items: [
              { id: '1', text: 'Code follows project style guidelines', category: 'code-quality' },
              { id: '2', text: 'No console.logs or debugging code', category: 'code-quality' },
              { id: '3', text: 'Unit tests added/updated', category: 'testing' },
              { id: '4', text: 'All tests passing', category: 'testing' },
              { id: '5', text: 'No sensitive data exposed', category: 'security' },
              { id: '6', text: 'Input validation in place', category: 'security' },
              { id: '7', text: 'README updated if needed', category: 'documentation' },
              { id: '8', text: 'No performance regressions', category: 'performance' },
            ],
          },
        ],
        activeTemplateId: 'default',
        prReviews: [],
      };

    case 'tech-debt':
      return {
        debtItems: [],
        filterType: undefined,
        filterSeverity: undefined,
        debtSortBy: 'severity',
      };

    case 'project-timeline':
      return {
        milestones: [],
        projectName: '',
        timelineViewMode: 'timeline',
        showCompleted: true,
      };

    case 'component-docs':
      return {
        components: [],
        filterCategory: undefined,
        componentFilterStatus: undefined,
        searchQuery: '',
      };

    case 'wireframe':
      return {
        elements: [],
        canvasWidth: 800,
        canvasHeight: 600,
        gridSize: 20,
        showGrid: true,
        snapToGrid: true,
        selectedElementId: undefined,
        zoom: 1,
      };

    case 'design-review':
      return {
        checklists: [
          {
            id: 'default',
            name: 'Design Review Checklist',
            items: [
              { id: '1', category: 'accessibility', text: 'Color contrast meets WCAG AA', description: 'Minimum 4.5:1 for normal text' },
              { id: '2', category: 'accessibility', text: 'Interactive elements are keyboard accessible' },
              { id: '3', category: 'usability', text: 'Clear visual hierarchy' },
              { id: '4', category: 'usability', text: 'Consistent spacing and alignment' },
              { id: '5', category: 'consistency', text: 'Follows design system guidelines' },
              { id: '6', category: 'consistency', text: 'Uses approved color palette' },
              { id: '7', category: 'responsive', text: 'Works on mobile devices' },
              { id: '8', category: 'responsive', text: 'Works on tablet devices' },
            ],
          },
        ],
        activeChecklistId: 'default',
        designReviews: [],
      };

    case 'env-vars':
      return {
        environments: [
          { id: 'dev', name: 'Development', color: '#10b981' },
          { id: 'staging', name: 'Staging', color: '#f59e0b' },
          { id: 'prod', name: 'Production', color: '#ef4444' },
        ],
        variables: [],
        selectedEnvironmentId: 'dev',
        showSecrets: false,
      };

    case 'git-commands':
      return {
        favorites: [],
        recentCommands: [],
        customCommands: [],
        filterCategory: undefined,
        showDescriptions: true,
      };

    case 'shadcn-builder':
      return {
        selectedComponents: [],
        selectedBlocks: [],
        theme: {
          baseColor: 'slate',
          accentColor: 'blue',
          radius: 0.5,
          font: 'inter',
          iconLibrary: 'lucide',
          framework: 'next',
        },
      };

    case 'password-manager':
      return { entries: [] };

    default:
      return {};
  }
}

// Helper to convert widget size to layout dimensions
export function getLayoutDimensionsFromSize(size: WidgetSize): { w: number; h: number; minW: number; minH: number } {
  return WIDGET_SIZE_PRESETS[size];
}

// Helper to determine widget size from layout dimensions
export function getSizeFromLayoutDimensions(w: number, h: number): WidgetSize {
  // Find closest matching size preset
  if (w === 1 && h <= 2) return 'small';
  if (w === 1 && h >= 4) return 'tall';
  if (w >= 3 && h <= 2) return 'wide';
  if (w >= 2 && h >= 4) return 'large';
  return 'medium';
}
