// Specific configuration interfaces for each widget type
export interface BaseWidgetConfig {
  limit?: number;
  sortBy?: 'createdAt' | 'title' | 'updatedAt' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
  showImages?: boolean;
  showDescriptions?: boolean;
}

export interface ClockWidgetConfig {
  format24Hour?: boolean;
  showDate?: boolean;
  showSeconds?: boolean;
  timezone?: string;
}

export interface StatsWidgetConfig {
  statTypes?: Array<'total' | 'categories' | 'tags' | 'favorites'>;
  displayMode?: 'compact' | 'detailed';
}

export interface NotesWidgetConfig {
  noteContent?: string;
  lastSaved?: string;
}

export interface ProgressGoal {
  id: string;
  name: string;
  type: 'numeric' | 'percentage' | 'boolean';
  current: number;
  target: number;
  color: string;
  unit?: string;
  completed?: boolean;
}

export interface ProgressWidgetConfig {
  goals?: ProgressGoal[];
}

export interface SearchWidgetConfig {
  limit?: number;
  searchPlaceholder?: string;
}

export interface BookmarksWidgetConfig {
  bookmarkedLinkIds?: string[];
  bookmarksViewMode?: 'grid' | 'list';
}

export interface ImageWidgetConfig {
  imageUrl?: string;
  linkUrl?: string;
  caption?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  showCaption?: boolean;
}

export interface WeatherWidgetConfig {
  location?: string;
  lat?: number;
  lon?: number;
  useGeolocation?: boolean;
  showApiHint?: boolean;
}

export type QuoteCategory = 'motivation' | 'success' | 'life' | 'wisdom' | 'creativity' | 'all';

export interface QuoteData {
  text: string;
  author: string;
  category: QuoteCategory;
  source?: 'api' | 'local';
}

export interface TranslationCacheEntry {
  text: string;
  author: string;
  timestamp: number;
}

export interface TranslationCache {
  [key: string]: TranslationCacheEntry;
}

export interface QuoteWidgetConfig {
  category?: string;
  currentQuoteIndex?: number;
  currentQuoteText?: string;
  favorites?: string[];
  apiQuotes?: QuoteData[];
  translationCache?: TranslationCache;
}

export interface PomodoroWidgetConfig {
  workDuration?: number;
  breakDuration?: number;
  soundEnabled?: boolean;
}

export interface CustomLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

// Widget theme definition for comprehensive theming
export interface WidgetTheme {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  border: string;
  gradient?: string;
}

export interface CustomWidgetConfig {
  customMode?: 'links' | 'text' | 'countdown' | 'embed' | 'gallery' | 'checklist';
  customBackground?: string;
  customTextColor?: string;
  customGradient?: string;
  widgetTheme?: WidgetTheme;
  customLinks?: CustomLink[];
  customText?: string;
  customHtml?: string;
  countdownDate?: string;
  countdownTitle?: string;
  countdownShowTime?: boolean;
  embedUrl?: string;
  embedHeight?: string;
  galleryImages?: GalleryImage[];
  galleryLayout?: 'grid' | 'masonry' | 'carousel';
  checklistItems?: ChecklistItem[];
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface TodoWidgetConfig {
  todoItems?: TodoItem[];
  showCompletedTodos?: boolean;
}

export interface CountdownWidgetConfig {
  targetDate?: string;
  eventName?: string;
}

export interface Habit {
  id: string;
  name: string;
  completedDates: string[];
  createdAt: string;
}

export interface HabitTrackerWidgetConfig {
  habits?: Habit[];
}

export interface RandomLinkWidgetConfig {
  autoShuffle?: boolean;
  shuffleInterval?: number;
  filterCategoryId?: string;
}

export interface GitHubActivityWidgetConfig {
  githubUsername?: string;
  showProfile?: boolean;
}

export interface RSSFeedWidgetConfig {
  feedUrls?: string[];
  refreshInterval?: number;
  maxItems?: number;
}

// Social/News Feed Widget Configs
export interface TwitterFeedWidgetConfig {
  twitterUsername?: string;
  embedTheme?: 'light' | 'dark';
}

export interface RedditWidgetConfig {
  subreddits?: string[];
  redditMaxItems?: number;
  redditRefreshInterval?: number;
  redditSortBy?: 'hot' | 'new' | 'top' | 'rising';
}

export interface HackerNewsWidgetConfig {
  hnMaxItems?: number;
  hnRefreshInterval?: number;
  hnStoryType?: 'top' | 'new' | 'best' | 'ask' | 'show';
}

export interface ProductHuntCacheItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  votesCount: number;
  commentsCount: number;
  thumbnailUrl?: string;
  topics: string[];
  makerNames: string[];
  featured: boolean;
  launchDate: string;
}

export interface ProductHuntWidgetConfig {
  phMaxItems?: number;
  productHuntCache?: ProductHuntCacheItem[];
}

export interface DevToFeedWidgetConfig {
  devToTags?: string[];
  devToMaxItems?: number;
  devToRefreshInterval?: number;
}

export interface ActivityLogEntry {
  date: string;
  count: number;
}

export interface ReadingStreakWidgetConfig {
  activityLog?: ActivityLogEntry[];
}

export interface GitHubTrendingWidgetConfig {
  trendingMaxItems?: number;
  maxItems?: number;
}

export interface SteamGamesWidgetConfig {
  maxItems?: number;
}

export interface NintendoDealsWidgetConfig {
  region?: 'ES' | 'US' | 'GB' | 'DE' | 'FR' | 'MX' | 'JP';
  maxItems?: number;
}

export interface GitHubSearchWidgetConfig {
  defaultSort?: string;
  defaultLanguage?: string;
}

export interface CodePenWidgetConfig {
  penUrl?: string;
  penId?: string;
  penUser?: string;
  codepenTheme?: 'dark' | 'light' | 'default';
  defaultTab?: 'result' | 'html' | 'css' | 'js';
  height?: number;
  editable?: boolean;
  showResult?: boolean;
}

export interface SpotifyWidgetConfig {
  spotifyUrl?: string;
  spotifyId?: string;
  spotifyType?: string;
  spotifyTheme?: '0' | '1';
  compact?: boolean;
}

export interface YouTubeWidgetConfig {
  videoUrl?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  startTime?: number;
}

export interface CryptoWidgetConfig {
  coins?: string[];
  currency?: string;
  refreshInterval?: number;
}

export interface TimeZoneInfo {
  id: string;
  name: string;
  timezone: string;
  offset: string;
}

export interface WorldClockWidgetConfig {
  timezones?: TimeZoneInfo[];
  format24Hour?: boolean;
  showSeconds?: boolean;
  showDate?: boolean;
}

export interface ColorInfo {
  id: string;
  hex: string;
  name?: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: ColorInfo[];
}

export interface ColorPaletteWidgetConfig {
  palettes?: ColorPalette[];
  activePaletteId?: string;
}

export interface UnsplashWidgetConfig {
  query?: string;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  autoRefresh?: boolean;
  refreshInterval?: number;
  showInfo?: boolean;
}

export interface QRCodeWidgetConfig {
  content?: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface Website {
  id: string;
  url: string;
  name?: string;
}

export interface WebsiteMonitorWidgetConfig {
  websites?: Website[];
  refreshInterval?: number;
}

export interface EmbedWidgetConfig {
  embedType?: 'url' | 'html';
  embedUrl?: string;
  embedHtml?: string;
  title?: string;
  allowFullscreen?: boolean;
}

// Prompt widget types
export type PromptCategory = 'coding' | 'writing' | 'analysis' | 'business' | 'learning' | 'creative' | 'general';

export interface PromptVariable {
  name: string;
  defaultValue?: string;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  category: PromptCategory;
  tags: string[];
  variables?: PromptVariable[];
  isFavorite: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  pattern: string;
  category: PromptCategory;
}

export interface PromptWidgetConfig {
  prompts?: Prompt[];
  selectedCategory?: PromptCategory | 'all';
  promptViewMode?: 'list' | 'grid';
  sortBy?: 'createdAt' | 'usageCount' | 'title' | 'updatedAt';
  showFavoritesOnly?: boolean;
  generatorTemplates?: PromptTemplate[];
}

// MCP Explorer Widget Types
export type MCPCategory =
  | 'all'
  | 'official'
  | 'databases'
  | 'developer-tools'
  | 'cloud'
  | 'communication'
  | 'file-systems'
  | 'search'
  | 'productivity'
  | 'ai-ml'
  | 'browser'
  | 'data';

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  author: string;
  repository: string;
  stars?: number;
  category: MCPCategory;
  language: 'typescript' | 'python' | 'go' | 'rust' | 'other';
  installCommand: string;
  isOfficial: boolean;
  features: string[];
  isFavorite?: boolean;
}

export interface MCPExplorerWidgetConfig {
  mcpCategory?: MCPCategory;
  mcpSearchQuery?: string;
  mcpViewMode?: 'grid' | 'list';
  mcpSortBy?: 'name' | 'stars' | 'category';
  mcpFavorites?: string[]; // IDs of favorite servers
  mcpShowOnlyFavorites?: boolean;
}

// Deployment Status Widget Types
export type DeploymentProvider = 'vercel' | 'netlify';
export type DeploymentState = 'ready' | 'building' | 'error' | 'queued' | 'canceled';

export interface DeploymentProject {
  id: string;
  name: string;
  url?: string;
  provider: DeploymentProvider;
}

export interface Deployment {
  id: string;
  projectId: string;
  projectName: string;
  url: string;
  state: DeploymentState;
  createdAt: string;
  readyAt?: string;
  branch?: string;
  commitMessage?: string;
  commitRef?: string;
  duration?: number; // in seconds
  provider: DeploymentProvider;
}

export interface DeploymentStatusWidgetConfig {
  deployProvider?: DeploymentProvider;
  deployConnected?: boolean;
  deployProjects?: DeploymentProject[];
  deploySelectedProjectIds?: string[];
  deployMaxItems?: number;
  deployAutoRefresh?: boolean;
  deployRefreshInterval?: number; // in seconds
}

// Voice Notes Widget Types
export interface VoiceNote {
  id: string;
  title: string;
  transcript: string;
  audioUrl?: string; // Base64 or blob URL
  duration: number; // in seconds
  createdAt: string;
  language: string;
}

export interface VoiceNotesWidgetConfig {
  voiceNotes?: VoiceNote[];
  voiceLanguage?: string; // BCP 47 language tag (e.g., 'es-ES', 'en-US')
  voiceAutoSave?: boolean;
  voiceContinuousMode?: boolean;
  voiceShowTranscript?: boolean;
}

// Calculator Widget Types
export interface CalculatorWidgetConfig {
  lastResult?: string;
  history?: string[];
  scientificMode?: boolean;
}

// Stopwatch Widget Types
export interface StopwatchLap {
  id: string;
  time: number;
  delta: number;
}

export interface StopwatchWidgetConfig {
  laps?: StopwatchLap[];
  savedTime?: number;
}

// JSON Formatter Widget Types
export interface JSONFormatterWidgetConfig {
  jsonContent?: string;
  indentSize?: number;
  sortKeys?: boolean;
}

// Base64 Tool Widget Types
export interface Base64ToolWidgetConfig {
  inputText?: string;
  outputText?: string;
  lastMode?: 'encode' | 'decode';
}

// Text Tools Widget Types
export interface TextToolsWidgetConfig {
  textContent?: string;
  lastTool?: string;
}

// Password Generator Widget Types
export interface PasswordGeneratorWidgetConfig {
  passwordLength?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  excludeAmbiguous?: boolean;
  customSymbols?: string;
  generatedPasswords?: string[];
}

// Lorem Ipsum Widget Types
export interface LoremIpsumWidgetConfig {
  paragraphCount?: number;
  wordCount?: number;
  generationType?: 'paragraphs' | 'words' | 'sentences';
  startWithLorem?: boolean;
}

// Dice Roller Widget Types
export interface DiceRollerWidgetConfig {
  diceType?: number; // 4, 6, 8, 10, 12, 20, 100
  diceCount?: number;
  modifier?: number;
  rollHistory?: Array<{ dice: string; result: number; timestamp: string }>;
}

// Unit Converter Widget Types
export interface UnitConverterWidgetConfig {
  unitCategory?: 'length' | 'weight' | 'temperature' | 'volume' | 'area' | 'speed' | 'time' | 'data';
  lastFromUnit?: string;
  lastToUnit?: string;
  lastValue?: number;
}

// Currency Converter Widget Types
export interface CurrencyConverterWidgetConfig {
  baseCurrency?: string;
  targetCurrency?: string;
  lastAmount?: number;
  favoritePairs?: Array<{ from: string; to: string }>;
}

// Markdown Preview Widget Types
export interface MarkdownPreviewWidgetConfig {
  markdownContent?: string;
  previewMode?: 'split' | 'preview' | 'edit';
  fontSize?: number;
}

// Regex Tester Widget Types
export interface RegexTesterWidgetConfig {
  pattern?: string;
  flags?: string;
  testString?: string;
  savedPatterns?: Array<{ name: string; pattern: string; flags: string }>;
}

// Color Converter Widget Types
export interface ColorConverterWidgetConfig {
  colorFormat?: 'hex' | 'rgb' | 'hsl' | 'hsv' | 'oklch';
  lastColor?: string;
  savedColors?: string[];
}

// Timezone Converter Widget Types
export interface TimezoneConverterWidgetConfig {
  sourceTimezone?: string;
  targetTimezones?: string[];
  use24Hour?: boolean;
}

// Hash Generator Widget Types
export interface HashGeneratorWidgetConfig {
  hashAlgorithm?: 'md5' | 'sha1' | 'sha256' | 'sha512';
  lastInput?: string;
  hashHistory?: Array<{ input: string; algorithm: string; hash: string }>;
}

// IP Info Widget Types
export interface IPInfoWidgetConfig {
  showIPv6?: boolean;
  showNetworkInfo?: boolean;
  autoRefresh?: boolean;
}

// Link Manager Widget Types
export interface LinkManagerWidgetConfig {
  // View settings
  linkManagerViewMode?: 'list' | 'grid' | 'table';
  linkManagerShowImages?: boolean;
  linkManagerShowDescriptions?: boolean;

  // Filtering (persisted)
  linkManagerFilterCategoryId?: string | null;
  linkManagerFilterTagIds?: string[];
  linkManagerFilterFavoritesOnly?: boolean;

  // Sorting
  linkManagerSortBy?: 'createdAt' | 'title' | 'updatedAt' | 'order';
  linkManagerSortOrder?: 'asc' | 'desc';

  // Features
  linkManagerEnableBulkSelection?: boolean;
  linkManagerEnableDragReorder?: boolean;
}

// UUID Generator Widget Types
export interface UUIDGeneratorWidgetConfig {
  uuidVersion?: 'v1' | 'v4';
  uppercase?: boolean;
  includeHyphens?: boolean;
  history?: string[];
}

// Number Converter Widget Types
export interface NumberConverterWidgetConfig {
  inputBase?: 'binary' | 'octal' | 'decimal' | 'hex';
  inputValue?: string;
}

// Tailwind Colors Widget Types
export interface TailwindColorWidgetConfig {
  classType?: 'bg' | 'text' | 'border';
  recentColors?: string[];
  tailwindFavoriteColors?: string[]; // Named uniquely to avoid conflict with ColorOfDayWidgetConfig.favoriteColors
  searchQuery?: string;
}

// Gradient Generator Widget Types
export interface GradientGeneratorWidgetConfig {
  gradientType?: 'linear' | 'radial';
  angle?: number;
  colors?: Array<{ color: string; position: number }>;
}

// Box Shadow Generator Widget Types
export interface BoxShadowGeneratorWidgetConfig {
  offsetX?: number;
  offsetY?: number;
  blurRadius?: number;
  spreadRadius?: number;
  color?: string;
  inset?: boolean;
}

// Clip Path Generator Widget Types
export interface ClipPathGeneratorWidgetConfig {
  clipPathShape?: 'circle' | 'ellipse' | 'inset' | 'polygon';
  clipPathUnit?: '%' | 'px';
  clipPathCircleRadius?: number;
  clipPathCircleX?: number;
  clipPathCircleY?: number;
  clipPathEllipseRx?: number;
  clipPathEllipseRy?: number;
  clipPathInsetTop?: number;
  clipPathInsetRight?: number;
  clipPathInsetBottom?: number;
  clipPathInsetLeft?: number;
  clipPathInsetRadius?: number;
  clipPathPolygonPoints?: Array<{ x: number; y: number }>;
  clipPathBackgroundImage?: string;
  clipPathUseImage?: boolean;
}

// Aspect Ratio Widget Types
export interface AspectRatioWidgetConfig {
  width?: number;
  height?: number;
  presets?: Array<{ name: string; width: number; height: number }>;
}

// JWT Decoder Widget Types
export interface JWTDecoderWidgetConfig {
  lastToken?: string;
  showRaw?: boolean;
}

// Age Calculator Widget Types
export interface AgeCalculatorWidgetConfig {
  birthDate?: string;
  showDays?: boolean;
  showWeeks?: boolean;
}

// Word Counter Widget Types
export interface WordCounterWidgetConfig {
  text?: string;
  showReadingTime?: boolean;
  wordsPerMinute?: number;
}

// SVG Wave Widget Types
export interface SVGWaveWidgetConfig {
  waveType?: 'sine' | 'zigzag' | 'bumps' | 'layered';
  peaks?: number;
  height?: number;
  amplitude?: number;
  complexity?: number;
  flipVertical?: boolean;
  flipHorizontal?: boolean;
  color1?: string;
  color2?: string;
  useGradient?: boolean;
  opacity?: number;
  position?: 'top' | 'bottom';
  previewBg?: string;
}

// Text Shadow Generator Widget Types
export interface TextShadowLayer {
  id: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
}

export interface TextShadowTextStyle {
  sampleText: string;
  fontSize: number;
  textColor: string;
  fontWeight: string;
  backgroundColor: string;
}

export interface TextShadowGeneratorWidgetConfig {
  textShadowLayers?: TextShadowLayer[];
  textShadowTextStyle?: TextShadowTextStyle;
}

// Contrast Checker Widget Types
export interface ContrastCheckerWidgetConfig {
  foregroundColor?: string;
  backgroundColor?: string;
}

// Spacing Calculator Widget Types
export interface SpacingCalculatorWidgetConfig {
  spacingBaseUnit?: number; // Base spacing unit in pixels (default 4)
  spacingUse8pxBase?: boolean; // Whether using 8px base system
  spacingCustomMultiplier?: number; // Custom multiplier value
}

// Flexbox Playground Widget Types
export interface FlexboxPlaygroundWidgetConfig {
  flexboxConfig?: {
    flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse';
    justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse';
    gap: number;
    itemCount: number;
  };
}

// Typography Scale Widget Types
export interface TypographyScaleWidgetConfig {
  typographyBaseSize?: number; // Base font size in pixels (default 16)
  typographyRatio?: number; // Scale ratio (default 1.25, 0 = custom)
  typographyCustomRatio?: number; // Custom ratio value
  typographySteps?: number; // Number of steps above base (default 8)
}

// State Machine Widget Types
export interface StateMachineWidgetConfig {
  stateMachine?: {
    states: Array<{
      id: string;
      name: string;
      type: 'idle' | 'action' | 'transition';
      x: number;
      y: number;
    }>;
    transitions: Array<{
      id: string;
      from: string;
      to: string;
      condition: string;
    }>;
    initialStateId: string | null;
    currentStateId: string | null;
  };
}

// Sprite Sheet Widget Types
export interface SpriteSheetWidgetConfig {
  spriteImageUrl?: string; // Uploaded sprite sheet image URL (base64 or URL)
  spriteGridMode?: 'rows-cols' | 'frame-size'; // Grid definition mode
  spriteRows?: number; // Number of rows (rows-cols mode)
  spriteCols?: number; // Number of columns (rows-cols mode)
  spriteFrameWidth?: number; // Frame width in pixels (frame-size mode)
  spriteFrameHeight?: number; // Frame height in pixels (frame-size mode)
  spriteOffsetX?: number; // Horizontal offset from top-left
  spriteOffsetY?: number; // Vertical offset from top-left
  spritePaddingX?: number; // Horizontal padding between frames
  spritePaddingY?: number; // Vertical padding between frames
}

// Pixel Art Widget Types
export interface PixelArtWidgetConfig {
  pixelData?: string[][]; // 2D array of pixel colors
  pixelGridSize?: number; // Grid size (8, 16, 32, 64)
  pixelZoom?: number; // Zoom level (0.5-3)
  pixelRecentColors?: string[]; // Recently used colors
  pixelFrames?: Array<{ id: string; data: string[][] }>; // Animation frames
  pixelFps?: number; // Animation FPS (1-30)
  pixelPaletteMode?: 'full' | 'gameboy' | 'nes' | 'custom'; // Palette mode
}

// Loot Table Widget Types
export interface LootTableWidgetConfig {
  lootTables?: Array<{
    id: string;
    name: string;
    items: Array<{
      id: string;
      name: string;
      rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
      weight: number;
    }>;
    guaranteedDrops?: {
      enabled: boolean;
      pityCounter: number;
      targetRarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
    };
  }>;
  activeTableId?: string;
}

// Inventory Grid Widget Types
export interface InventoryGridWidgetConfig {
  rows?: number;
  cols?: number;
  items?: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    width: number;
    height: number;
    stackSize: number;
    maxStack: number;
    type: 'weapon' | 'armor' | 'consumable' | 'key-item' | 'material' | 'misc';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    weight?: number;
    x?: number;
    y?: number;
    rotation?: 0 | 90 | 180 | 270;
  }>;
  grid?: Array<Array<{ itemId: string | null; occupied: boolean }>>;
  hotbarSlots?: Array<{ itemId: string | null; slotIndex: number }>;
  equipmentSlots?: Array<{
    id: string;
    name: string;
    icon: string;
    itemId: string | null;
    allowedTypes: Array<'weapon' | 'armor' | 'consumable' | 'key-item' | 'material' | 'misc'>;
  }>;
  maxWeight?: number;
  enableWeight?: boolean;
  testMode?: boolean;
}

// Hitbox Editor Widget Types
export interface HitboxEditorWidgetConfig {
  hitboxSpriteUrl?: string; // Sprite/image background reference
  hitboxFrames?: Array<{
    id: string;
    name: string;
    hitboxes: Array<{
      id: string;
      name: string;
      shape: 'rectangle' | 'circle' | 'polygon';
      layer: 'hurt' | 'hit' | 'collision';
      x: number;
      y: number;
      width: number;
      height: number;
      radius?: number;
      points?: Array<{ x: number; y: number }>;
      visible: boolean;
    }>;
  }>;
  hitboxZoom?: number; // Canvas zoom level
}

// Pathfinding Widget Types
export interface PathfindingWidgetConfig {
  pathfindingGridSize?: number;
  pathfindingAlgorithm?: 'astar' | 'dijkstra' | 'bfs' | 'dfs' | 'greedy';
  pathfindingHeuristic?: 'manhattan' | 'euclidean' | 'chebyshev';
  pathfindingSpeed?: number;
  pathfindingAllowDiagonal?: boolean;
}

// Health Bar Widget Types
export interface HealthBarWidgetConfig {
  healthBarConfig?: {
    type: 'horizontal' | 'vertical' | 'circular' | 'segmented';
    width: number;
    height: number;
    borderRadius: number;
    fillType: 'solid' | 'gradient';
    fillColor: string;
    fillColorEnd?: string;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    segmentCount: number;
    textDisplay: 'current-max' | 'percentage' | 'none';
    textColor: string;
    icon: 'heart' | 'shield' | 'zap' | 'droplet' | 'none';
    showIcon: boolean;
  };
  healthBarAnimationConfig?: {
    fillSpeed: number;
    flashSpeed: number;
    damageDelay: number;
    enableDamageBar: boolean;
    enableFlash: boolean;
    enableShake: boolean;
    lowHealthThreshold: number;
  };
}

// Behavior Tree Widget Types
export interface BehaviorTreeWidgetConfig {
  behaviorTree?: {
    nodes: Array<{
      id: string;
      type: string;
      name: string;
      description?: string;
      x: number;
      y: number;
      parentId: string | null;
      children: string[];
      collapsed: boolean;
      status: string;
      parameters?: Record<string, string | number | boolean>;
    }>;
    rootId: string | null;
    blackboard: Record<string, string | number | boolean>;
  };
}

// Input Mapper Widget Types
export interface InputMapperWidgetConfig {
  inputMapperActions?: Array<{
    id: string;
    name: string;
    category: 'movement' | 'combat' | 'ui' | 'interaction' | 'camera' | 'system' | 'custom';
    description?: string;
  }>;
  inputMapperBindings?: Array<{
    actionId: string;
    controllerType: 'xbox' | 'playstation' | 'nintendo' | 'keyboard';
    buttonKey: string;
    buttonLabel: string;
    inputType: 'button' | 'axis' | 'trigger' | 'dpad';
    pressType: 'press' | 'hold' | 'double-tap';
    axisDirection?: 'positive' | 'negative' | 'both';
    deadZone?: number;
    sensitivity?: number;
    isRebindable: boolean;
    isAlternative?: boolean;
  }>;
  inputMapperSelectedController?: 'xbox' | 'playstation' | 'nintendo' | 'keyboard';
  inputMapperShowConflicts?: boolean;
  inputMapperDeadZoneGlobal?: number;
  inputMapperSensitivityGlobal?: number;
  inputMapperPreviewMode?: boolean;
  inputMapperHighlightedAction?: string | null;
}

// Wave Spawner Widget Types
export interface WaveSpawnerWidgetConfig {
  enemyTypes?: Array<{
    id: string;
    name: string;
    emoji: string;
    health: number;
    speed: number;
    damage: number;
    points: number;
    color: string;
  }>;
  waves?: Array<{
    id: string;
    number: number;
    name: string;
    spawns: Array<{
      id: string;
      enemyTypeId: string;
      count: number;
      spawnDelay: number;
    }>;
    spawnInterval: number;
    waveDuration: number;
    delayBeforeNext: number;
    pattern: 'linear' | 'burst' | 'random' | 'formation';
    difficultyMultiplier: number;
  }>;
  activeWaveId?: string;
  selectedPreset?: 'tower-defense' | 'survival' | 'boss-rush' | 'endless';
}

// Level Progress Widget - Game progression curve designer
export interface LevelProgressWidgetConfig {
  levelProgressConfig?: {
    type: 'linear' | 'quadratic' | 'exponential' | 'logarithmic' | 'custom';
    baseXP: number;
    scalingFactor: number;
    maxLevel: number;
    customPoints?: Array<{ level: number; xp: number }>;
  };
  statGains?: Array<{
    id: string;
    name: string;
    baseValue: number;
    perLevel: number;
    scalingType: 'linear' | 'exponential';
    scalingFactor: number;
  }>;
  levelMilestones?: Array<{
    level: number;
    name: string;
    reward?: string;
  }>;
  prestigeConfig?: {
    enabled: boolean;
    bonusPerPrestige: number;
    maxPrestiges: number;
    currentPrestige: number;
  };
}

// ==========================================
// Organization & Productivity Widget Types
// ==========================================

// Design Tokens Widget - Design system tokens manager
export interface DesignTokensWidgetConfig {
  tokens?: {
    colors?: Array<{
      id: string;
      name: string;
      value: string;
      category: 'primary' | 'secondary' | 'neutral' | 'semantic' | 'custom';
    }>;
    typography?: Array<{
      id: string;
      name: string;
      fontFamily: string;
      fontSize: string;
      fontWeight: string;
      lineHeight: string;
    }>;
    spacing?: Array<{
      id: string;
      name: string;
      value: string;
    }>;
    shadows?: Array<{
      id: string;
      name: string;
      value: string;
    }>;
    radii?: Array<{
      id: string;
      name: string;
      value: string;
    }>;
  };
  activeTab?: 'colors' | 'typography' | 'spacing' | 'shadows' | 'radii';
  exportFormat?: 'css' | 'scss' | 'json' | 'tailwind';
}

// Code Snippets Widget - Code snippets library
export interface CodeSnippetsWidgetConfig {
  snippets?: Array<{
    id: string;
    title: string;
    language: string;
    code: string;
    description?: string;
    tags?: string[];
    isFavorite?: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  selectedSnippetId?: string;
  filterLanguage?: string;
  filterTag?: string;
  snippetSortBy?: 'title' | 'createdAt' | 'language';
}

// Sprint Tasks Widget - Kanban-style task board
export interface SprintTasksWidgetConfig {
  sprint?: {
    name: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
  };
  columns?: Array<{
    id: string;
    name: string;
    wipLimit?: number;
  }>;
  sprintTasks?: Array<{
    id: string;
    title: string;
    columnId: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignee?: string;
    dueDate?: string;
    tags?: string[];
    storyPoints?: number;
    order: number;
  }>;
}

// Decision Log Widget - Architecture Decision Records (ADR)
export interface DecisionLogWidgetConfig {
  decisions?: Array<{
    id: string;
    title: string;
    status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
    context: string;
    decision: string;
    consequences?: string;
    date: string;
    author?: string;
    supersededBy?: string;
    tags?: string[];
  }>;
  decisionFilterStatus?: 'all' | 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  decisionSortBy?: 'date' | 'title' | 'status';
}

// Eisenhower Matrix Widget - Priority quadrant matrix
export interface EisenhowerMatrixWidgetConfig {
  matrixTasks?: Array<{
    id: string;
    title: string;
    quadrant: 'do' | 'schedule' | 'delegate' | 'eliminate';
    completed?: boolean;
    dueDate?: string;
    createdAt: string;
  }>;
  showCompleted?: boolean;
}

// Standup Notes Widget - Daily standup template
export interface StandupNotesWidgetConfig {
  standups?: Array<{
    date: string;
    yesterday: Array<{
      id: string;
      text: string;
      timestamp: number;
    }>;
    today: Array<{
      id: string;
      text: string;
      timestamp: number;
    }>;
    blockers: Array<{
      id: string;
      text: string;
      timestamp: number;
    }>;
    teamMember?: string;
  }>;
  teamMembers?: string[];
  currentMemberId?: string;
}

// Mood Board Widget - Design inspiration collector
export interface MoodBoardWidgetConfig {
  moodBoardItems?: Array<{
    id: string;
    type: 'image' | 'color' | 'note' | 'link';
    content: string;
    color?: string;
    linkPreview?: {
      title?: string;
      image?: string;
    };
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  }>;
  boardName?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  zoom?: number;
}

// API Reference Widget - API endpoints documentation
export interface APIReferenceWidgetConfig {
  endpoints?: Array<{
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    description?: string;
    parameters?: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
    }>;
    responseExample?: string;
    tags?: string[];
  }>;
  baseUrl?: string;
  filterMethod?: 'all' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  filterTag?: string;
}

// Meeting Notes Widget - Structured meeting notes
export interface MeetingNotesWidgetConfig {
  meetings?: Array<{
    id: string;
    title: string;
    date: string;
    attendees: string[];
    agenda: string[];
    notes: string;
    actionItems: Array<{
      id: string;
      task: string;
      assignee?: string;
      dueDate?: string;
      completed: boolean;
    }>;
    decisions: string[];
  }>;
  selectedMeetingId?: string;
  meetingSortBy?: 'date' | 'title';
}

// Weekly Goals Widget - OKR tracking
export interface WeeklyGoalsWidgetConfig {
  weeks?: Array<{
    id: string;
    weekStart: string;
    goals: Array<{
      id: string;
      title: string;
      keyResults?: Array<{
        id: string;
        title: string;
        target: number;
        current: number;
        unit?: string;
      }>;
      status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
      priority: 'low' | 'medium' | 'high';
    }>;
    reflection?: string;
  }>;
  currentWeekId?: string;
}

// Parking Lot Widget - Ideas backlog
export interface ParkingLotWidgetConfig {
  ideas?: Array<{
    id: string;
    title: string;
    description: string;
    category: 'feature' | 'improvement' | 'bug' | 'research' | 'other';
    priority: 'low' | 'medium' | 'high' | 'critical';
    votes: number;
    status: 'new' | 'under-review' | 'planned' | 'rejected';
    createdAt: number;
    tags: string[];
  }>;
  filterCategory?: string;
  ideaFilterStatus?: string;
  ideaSortBy?: 'votes' | 'priority' | 'createdAt';
}

// PR Checklist Widget - Code review checklist
export interface PRChecklistWidgetConfig {
  templates?: Array<{
    id: string;
    name: string;
    items: Array<{
      id: string;
      text: string;
      category: 'code-quality' | 'testing' | 'security' | 'documentation' | 'performance';
    }>;
  }>;
  activeTemplateId?: string;
  prReviews?: Array<{
    id: string;
    prTitle: string;
    prUrl?: string;
    templateId: string;
    checkedItems: string[];
    notes?: string;
    status: 'in-progress' | 'approved' | 'changes-requested';
    createdAt: string;
  }>;
}

// Tech Debt Widget - Technical debt tracker
export interface TechDebtWidgetConfig {
  debtItems?: Array<{
    id: string;
    title: string;
    description: string;
    location: string;
    type: 'code-smell' | 'outdated-dependency' | 'missing-tests' | 'poor-performance' | 'security' | 'documentation' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    effort: 'small' | 'medium' | 'large' | 'xlarge';
    status: 'identified' | 'planned' | 'in-progress' | 'resolved';
    createdAt: string;
    resolvedAt?: string;
    tags: string[];
  }>;
  filterType?: string;
  filterSeverity?: string;
  debtSortBy?: 'severity' | 'effort' | 'createdAt';
}

// Project Timeline Widget - Milestones tracker
export interface ProjectTimelineWidgetConfig {
  milestones?: Array<{
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    status: 'upcoming' | 'in-progress' | 'completed' | 'delayed';
    progress?: number;
    dependencies?: string[];
    assignees?: string[];
    color?: string;
  }>;
  projectName?: string;
  timelineViewMode?: 'timeline' | 'list' | 'gantt';
  showCompleted?: boolean;
}

// Component Docs Widget - Component library reference
export interface ComponentDocsWidgetConfig {
  components?: Array<{
    id: string;
    name: string;
    description?: string;
    category: string;
    props?: Array<{
      name: string;
      type: string;
      required: boolean;
      defaultValue?: string;
      description?: string;
    }>;
    usageExample?: string;
    figmaUrl?: string;
    storybookUrl?: string;
    status: 'stable' | 'beta' | 'deprecated' | 'experimental';
  }>;
  filterCategory?: string;
  componentFilterStatus?: string;
  searchQuery?: string;
}

// Wireframe Widget - Quick wireframing tool
export interface WireframeWidgetConfig {
  elements?: Array<{
    id: string;
    type: 'rectangle' | 'text' | 'button' | 'input' | 'image' | 'icon' | 'line' | 'circle';
    x: number;
    y: number;
    width: number;
    height: number;
    content?: string;
    style?: {
      fill?: string;
      stroke?: string;
      fontSize?: number;
      borderRadius?: number;
    };
  }>;
  canvasWidth?: number;
  canvasHeight?: number;
  gridSize?: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
  selectedElementId?: string;
  zoom?: number;
}

// Design Review Widget - Design review checklist
export interface DesignReviewWidgetConfig {
  checklists?: Array<{
    id: string;
    name: string;
    items: Array<{
      id: string;
      category: 'accessibility' | 'usability' | 'consistency' | 'branding' | 'responsive' | 'performance';
      text: string;
      description?: string;
    }>;
  }>;
  activeChecklistId?: string;
  designReviews?: Array<{
    id: string;
    designName: string;
    designUrl?: string;
    checklistId: string;
    checkedItems: string[];
    feedback?: string;
    status: 'pending' | 'approved' | 'needs-changes';
    reviewer?: string;
    createdAt: string;
  }>;
}

// Environment Vars Widget - Environment variables reference
export interface EnvVarsWidgetConfig {
  environments?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  variables?: Array<{
    id: string;
    key: string;
    description?: string;
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'url' | 'secret';
    defaultValue?: string;
    values?: Record<string, string>;
    tags?: string[];
  }>;
  selectedEnvironmentId?: string;
  showSecrets?: boolean;
  filterTag?: string;
}

// Git Commands Widget - Git cheatsheet
export interface GitCommandsWidgetConfig {
  favorites?: string[];
  recentCommands?: string[];
  customCommands?: Array<{
    id: string;
    name: string;
    command: string;
    description?: string;
    category: string;
  }>;
  filterCategory?: string;
  showDescriptions?: boolean;
}

// ==================== NEW WIDGETS CONFIG INTERFACES ====================

// Wellness & Life Tracking Widgets
export interface MoodTrackerWidgetConfig {
  moodEntries?: Array<{
    id: string;
    date: string;
    mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
    note?: string;
    createdAt: string;
  }>;
}

export interface WaterIntakeWidgetConfig {
  waterIntake?: {
    current: number;
    goal: number;
    date: string;
    history?: Array<{ date: string; amount: number }>;
  };
}

export interface SleepLogWidgetConfig {
  sleepEntries?: Array<{
    id: string;
    date: string;
    bedtime: string;
    wakeTime: string;
    duration: number;
    quality?: 'great' | 'good' | 'okay' | 'poor';
  }>;
}

export interface BreathingExerciseWidgetConfig {
  selectedExercise?: 'box' | '478' | 'calm';
  customPattern?: { inhale: number; hold1: number; exhale: number; hold2: number };
  sessionsCompleted?: number;
}

export interface GratitudeJournalWidgetConfig {
  gratitudeEntries?: Array<{
    id: string;
    date: string;
    items: string[];
    createdAt: string;
  }>;
}

export interface DailyAffirmationsWidgetConfig {
  favoriteAffirmations?: string[];
  customAffirmations?: string[];
  lastShownIndex?: number;
}

// Finance Widgets
export interface ExpenseTrackerWidgetConfig {
  expenses?: Array<{
    id: string;
    amount: number;
    category: 'food' | 'transport' | 'entertainment' | 'shopping' | 'bills' | 'other';
    description: string;
    createdAt: string;
  }>;
  currency?: string;
}

export interface BudgetProgressWidgetConfig {
  budgets?: Array<{
    id: string;
    name: string;
    limit: number;
    spent: number;
    color: string;
  }>;
  currency?: string;
}

export interface SavingsGoalWidgetConfig {
  savingsGoals?: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    color: string;
    createdAt: string;
  }>;
  currency?: string;
}

export interface SubscriptionManagerWidgetConfig {
  subscriptions?: Array<{
    id: string;
    name: string;
    cost: number;
    billingCycle: 'monthly' | 'yearly';
    nextRenewal: string;
    color: string;
    category?: string;
  }>;
  currency?: string;
}

// Advanced Productivity Widgets
export interface FocusScoreWidgetConfig {
  focusSessions?: Array<{
    id: string;
    date: string;
    duration: number;
    type: 'pomodoro' | 'deep-work';
  }>;
  dailyGoal?: number;
}

export interface TimeBlockingWidgetConfig {
  timeBlocks?: Array<{
    id: string;
    title: string;
    startHour: number; // 0-23
    startMinute: number; // 0 or 30
    endHour: number;
    endMinute: number;
    color: string;
    date: string; // ISO date string
  }>;
  workHoursOnly?: boolean; // If true, show 8-18, else 0-23
  startHour?: number;
  endHour?: number;
}

export interface DailyReviewWidgetConfig {
  reviews?: Array<{
    id: string;
    date: string;
    wentWell: string[];
    toImprove: string[];
    tomorrowPriorities: string[];
  }>;
}

export interface ParkingLotEnhancedWidgetConfig {
  parkingLotItems?: Array<{
    id: string;
    title: string;
    description?: string;
    votes: number;
    category: string;
    status: 'pending' | 'implemented' | 'rejected';
    createdAt: string;
  }>;
  categories?: string[];
}

export interface EnergyTrackerWidgetConfig {
  energyLogs?: Array<{
    id: string;
    date: string;
    timeSlot: 'morning' | 'late-morning' | 'afternoon' | 'evening';
    level: 1 | 2 | 3 | 4 | 5;
    note?: string;
  }>;
}

// Entertainment & Media Widgets
export interface MovieTrackerWidgetConfig {
  movies?: Array<{
    id: string;
    title: string;
    year?: string;
    posterUrl?: string;
    status: 'toWatch' | 'watching' | 'watched';
    rating?: number;
    addedAt: string;
  }>;
}

export interface BookTrackerWidgetConfig {
  books?: Array<{
    id: string;
    title: string;
    author?: string;
    totalPages: number;
    currentPage: number;
    addedAt: string;
    completedAt?: string;
  }>;
  yearlyGoal?: number;
}

export interface AnimeListWidgetConfig {
  animeList?: Array<{
    id: string;
    title: string;
    type: 'anime' | 'manga';
    totalEpisodes: number;
    currentEpisode: number;
    status: 'planToWatch' | 'watching' | 'completed' | 'dropped';
    score: number;
    addedAt: string;
  }>;
}

export interface GameBacklogWidgetConfig {
  games?: Array<{
    id: string;
    title: string;
    platform: 'PC' | 'PS5' | 'Xbox' | 'Switch' | 'Mobile' | 'Other';
    status: 'backlog' | 'playing' | 'completed' | 'abandoned';
    priority: 'low' | 'medium' | 'high';
    playtime?: number;
  }>;
}

export interface WishlistWidgetConfig {
  wishlistItems?: Array<{
    id: string;
    name: string;
    price?: number;
    link?: string;
    category: 'tech' | 'games' | 'books' | 'other';
    priority: 'low' | 'medium' | 'high';
    purchased: boolean;
    addedAt: string;
    purchasedAt?: string;
  }>;
  currency?: string;
}

// AI & Intelligence Widgets
export interface AIChatWidgetConfig {
  chatMessages?: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

export interface AIDailySummaryWidgetConfig {
  lastSummaryDate?: string;
  customInsights?: string[];
}

export interface SmartSuggestionsWidgetConfig {
  lastSuggestions?: string[];
  lastRefreshDate?: string;
}

// Design & Creativity Widgets
export interface ColorOfDayFavorite {
  hex: string;
  name: string;
  date: string;
}

export interface ColorOfDayWidgetConfig {
  favoriteColors?: ColorOfDayFavorite[];
  lastGeneratedDate?: string;
  currentColor?: string;
  showComplementary?: boolean;
}

export interface FontPairingWidgetConfig {
  fontPairings?: Array<{
    id: string;
    heading: string;
    body: string;
    name?: string;
  }>;
  favorites?: string[];
}

export interface DesignInspirationItem {
  id: string;
  imageUrl: string;
  title: string;
  author: string;
  authorUrl?: string;
  source: string;
  sourceUrl: string;
  tags: string[];
}

export interface DesignInspirationWidgetConfig {
  savedInspirations?: DesignInspirationItem[];
  currentCategory?: string;
  viewedIds?: string[];
  lastImageUrl?: string;
}

export interface IconPickerWidgetConfig {
  recentIcons?: string[];
  favoriteIcons?: string[];
}

export interface ScreenshotMockupWidgetConfig {
  recentScreenshots?: Array<{
    id: string;
    url: string;
    device: 'iphone' | 'ipad' | 'macbook' | 'browser' | 'android';
    createdAt: string;
  }>;
  lastDevice?: 'iphone' | 'ipad' | 'macbook' | 'browser' | 'android';
  lastColor?: string;
}

// Utility Widgets (new)
export interface ClipboardHistoryWidgetConfig {
  clipboardHistory?: Array<{
    id: string;
    content: string;
    timestamp: string;
    type: 'text' | 'url' | 'code';
  }>;
  maxItems?: number;
}

export interface StickyNotesWidgetConfig {
  stickyNotes?: Array<{
    id: string;
    content: string;
    color: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface LinkPreviewerWidgetConfig {
  previewHistory?: Array<{
    id: string;
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    favicon: string | null;
    timestamp: string;
  }>;
}

export interface SiteStatusWidgetConfig {
  monitoredSites?: Array<{
    id: string;
    url: string;
    name: string;
    addedAt: string;
    lastStatus?: 'online' | 'offline' | 'unknown';
    lastResponseTime?: number;
    lastChecked?: string;
  }>;
  refreshInterval?: number;
}

export interface APITesterWidgetConfig {
  lastRequest?: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers?: string;
    body?: string;
  };
  savedRequests?: Array<{
    id: string;
    name: string;
    method: string;
    url: string;
    headers?: string;
    body?: string;
  }>;
}

export interface CronBuilderWidgetConfig {
  savedCrons?: Array<{
    id: string;
    expression: string;
    description: string;
    createdAt: string;
  }>;
  lastExpression?: string;
}

export interface DiffViewerWidgetConfig {
  lastDiff?: {
    original: string;
    modified: string;
  };
  viewMode?: 'split' | 'inline';
}

// Combined widget config interface that includes all possible config properties
// This allows any widget to access any config property without type errors
export interface WidgetConfig
  extends Partial<BaseWidgetConfig>,
    Partial<ClockWidgetConfig>,
    Partial<StatsWidgetConfig>,
    Partial<NotesWidgetConfig>,
    Partial<ProgressWidgetConfig>,
    Partial<SearchWidgetConfig>,
    Partial<BookmarksWidgetConfig>,
    Partial<ImageWidgetConfig>,
    Partial<WeatherWidgetConfig>,
    Partial<QuoteWidgetConfig>,
    Partial<PomodoroWidgetConfig>,
    Partial<CustomWidgetConfig>,
    Partial<TodoWidgetConfig>,
    Partial<CountdownWidgetConfig>,
    Partial<HabitTrackerWidgetConfig>,
    Partial<RandomLinkWidgetConfig>,
    Partial<GitHubActivityWidgetConfig>,
    Partial<RSSFeedWidgetConfig>,
    Partial<ReadingStreakWidgetConfig>,
    Partial<GitHubTrendingWidgetConfig>,
    Partial<SteamGamesWidgetConfig>,
    Partial<GitHubSearchWidgetConfig>,
    Partial<CodePenWidgetConfig>,
    Partial<SpotifyWidgetConfig>,
    Partial<YouTubeWidgetConfig>,
    Partial<CryptoWidgetConfig>,
    Partial<WorldClockWidgetConfig>,
    Partial<ColorPaletteWidgetConfig>,
    Partial<UnsplashWidgetConfig>,
    Partial<QRCodeWidgetConfig>,
    Partial<WebsiteMonitorWidgetConfig>,
    Partial<EmbedWidgetConfig>,
    Partial<PromptWidgetConfig>,
    Partial<MCPExplorerWidgetConfig>,
    Partial<DeploymentStatusWidgetConfig>,
    Partial<VoiceNotesWidgetConfig>,
    Partial<LinkManagerWidgetConfig>,
    // Social/News Feed widgets
    Partial<TwitterFeedWidgetConfig>,
    Partial<RedditWidgetConfig>,
    Partial<HackerNewsWidgetConfig>,
    Partial<ProductHuntWidgetConfig>,
    Partial<DevToFeedWidgetConfig>,
    Partial<CalculatorWidgetConfig>,
    Partial<StopwatchWidgetConfig>,
    Partial<JSONFormatterWidgetConfig>,
    Partial<Base64ToolWidgetConfig>,
    Partial<TextToolsWidgetConfig>,
    Partial<PasswordGeneratorWidgetConfig>,
    Partial<LoremIpsumWidgetConfig>,
    Partial<DiceRollerWidgetConfig>,
    Partial<UnitConverterWidgetConfig>,
    Partial<CurrencyConverterWidgetConfig>,
    Partial<MarkdownPreviewWidgetConfig>,
    Partial<RegexTesterWidgetConfig>,
    Partial<ColorConverterWidgetConfig>,
    Partial<TimezoneConverterWidgetConfig>,
    Partial<HashGeneratorWidgetConfig>,
    Partial<IPInfoWidgetConfig>,
    Partial<UUIDGeneratorWidgetConfig>,
    Partial<NumberConverterWidgetConfig>,
    Partial<TailwindColorWidgetConfig>,
    Partial<GradientGeneratorWidgetConfig>,
    Partial<BoxShadowGeneratorWidgetConfig>,
    Partial<ClipPathGeneratorWidgetConfig>,
    Partial<AspectRatioWidgetConfig>,
    Partial<JWTDecoderWidgetConfig>,
    Partial<AgeCalculatorWidgetConfig>,
    Partial<WordCounterWidgetConfig>,
    Partial<TextShadowGeneratorWidgetConfig>,
    Partial<SVGWaveWidgetConfig>,
    Partial<ContrastCheckerWidgetConfig>,
    Partial<SpacingCalculatorWidgetConfig>,
    Partial<FlexboxPlaygroundWidgetConfig>,
    Partial<TypographyScaleWidgetConfig>,
    Partial<StateMachineWidgetConfig>,
    Partial<SpriteSheetWidgetConfig>,
    Partial<PixelArtWidgetConfig>,
    Partial<LootTableWidgetConfig>,
    Partial<InventoryGridWidgetConfig>,
    Partial<HitboxEditorWidgetConfig>,
    Partial<PathfindingWidgetConfig>,
    Partial<HealthBarWidgetConfig>,
    Partial<InputMapperWidgetConfig>,
    Partial<BehaviorTreeWidgetConfig>,
    Partial<WaveSpawnerWidgetConfig>,
    Partial<LevelProgressWidgetConfig>,
    // Organization & Productivity widgets
    Partial<DesignTokensWidgetConfig>,
    Partial<CodeSnippetsWidgetConfig>,
    Partial<SprintTasksWidgetConfig>,
    Partial<DecisionLogWidgetConfig>,
    Partial<EisenhowerMatrixWidgetConfig>,
    Partial<StandupNotesWidgetConfig>,
    Partial<MoodBoardWidgetConfig>,
    Partial<APIReferenceWidgetConfig>,
    Partial<MeetingNotesWidgetConfig>,
    Partial<WeeklyGoalsWidgetConfig>,
    Partial<ParkingLotWidgetConfig>,
    Partial<PRChecklistWidgetConfig>,
    Partial<TechDebtWidgetConfig>,
    Partial<ProjectTimelineWidgetConfig>,
    Partial<ComponentDocsWidgetConfig>,
    Partial<WireframeWidgetConfig>,
    Partial<DesignReviewWidgetConfig>,
    Partial<EnvVarsWidgetConfig>,
    Partial<GitCommandsWidgetConfig>,
    // New Wellness widgets
    Partial<MoodTrackerWidgetConfig>,
    Partial<WaterIntakeWidgetConfig>,
    Partial<SleepLogWidgetConfig>,
    Partial<BreathingExerciseWidgetConfig>,
    Partial<GratitudeJournalWidgetConfig>,
    Partial<DailyAffirmationsWidgetConfig>,
    // New Finance widgets
    Partial<ExpenseTrackerWidgetConfig>,
    Partial<BudgetProgressWidgetConfig>,
    Partial<SavingsGoalWidgetConfig>,
    Partial<SubscriptionManagerWidgetConfig>,
    // New Productivity widgets
    Partial<FocusScoreWidgetConfig>,
    Partial<TimeBlockingWidgetConfig>,
    Partial<DailyReviewWidgetConfig>,
    Partial<ParkingLotEnhancedWidgetConfig>,
    Partial<EnergyTrackerWidgetConfig>,
    // New Entertainment widgets
    Partial<MovieTrackerWidgetConfig>,
    Partial<BookTrackerWidgetConfig>,
    Partial<AnimeListWidgetConfig>,
    Partial<GameBacklogWidgetConfig>,
    Partial<WishlistWidgetConfig>,
    // New AI widgets
    Partial<AIChatWidgetConfig>,
    Partial<AIDailySummaryWidgetConfig>,
    Partial<SmartSuggestionsWidgetConfig>,
    // New Social widgets
    Partial<TwitterFeedWidgetConfig>,
    Partial<RedditWidgetConfig>,
    Partial<HackerNewsWidgetConfig>,
    Partial<ProductHuntWidgetConfig>,
    Partial<DevToFeedWidgetConfig>,
    // New Design widgets
    Partial<ColorOfDayWidgetConfig>,
    Partial<FontPairingWidgetConfig>,
    Partial<DesignInspirationWidgetConfig>,
    Partial<IconPickerWidgetConfig>,
    Partial<ScreenshotMockupWidgetConfig>,
    // New Utility widgets
    Partial<ClipboardHistoryWidgetConfig>,
    Partial<StickyNotesWidgetConfig>,
    Partial<LinkPreviewerWidgetConfig>,
    Partial<SiteStatusWidgetConfig>,
    Partial<APITesterWidgetConfig>,
    Partial<CronBuilderWidgetConfig>,
    Partial<DiffViewerWidgetConfig> {
  // Allow additional properties for extensibility
  [key: string]: unknown;
}
