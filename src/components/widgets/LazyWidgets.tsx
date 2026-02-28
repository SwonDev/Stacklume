"use client";

import { lazy, Suspense } from "react";
import { WidgetSkeleton } from "./WidgetSkeleton";
import type { Widget } from "@/types/widget";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LazyWidgetComponent = React.LazyExoticComponent<React.ComponentType<any>>;

// Lazy load all widget components
const ClockWidget = lazy(() => import("./ClockWidget").then(m => ({ default: m.ClockWidget })));
const StatsWidget = lazy(() => import("./StatsWidget").then(m => ({ default: m.StatsWidget })));
const LinkAnalyticsWidget = lazy(() => import("./LinkAnalyticsWidget").then(m => ({ default: m.LinkAnalyticsWidget })));
const NotesWidget = lazy(() => import("./NotesWidget").then(m => ({ default: m.NotesWidget })));
const QuickAddWidget = lazy(() => import("./QuickAddWidget").then(m => ({ default: m.QuickAddWidget })));
const ProgressWidget = lazy(() => import("./ProgressWidget").then(m => ({ default: m.ProgressWidget })));
const WeatherWidget = lazy(() => import("./WeatherWidget").then(m => ({ default: m.WeatherWidget })));
const QuoteWidget = lazy(() => import("./QuoteWidget").then(m => ({ default: m.QuoteWidget })));
const PomodoroWidget = lazy(() => import("./PomodoroWidget").then(m => ({ default: m.PomodoroWidget })));
const CalendarWidget = lazy(() => import("./CalendarWidget").then(m => ({ default: m.CalendarWidget })));
const CustomWidget = lazy(() => import("./CustomWidget").then(m => ({ default: m.CustomWidget })));
const SearchWidget = lazy(() => import("./SearchWidget").then(m => ({ default: m.SearchWidget })));
const BookmarksWidget = lazy(() => import("./BookmarksWidget").then(m => ({ default: m.BookmarksWidget })));
const ImageWidget = lazy(() => import("./ImageWidget").then(m => ({ default: m.ImageWidget })));
const TodoWidget = lazy(() => import("./TodoWidget").then(m => ({ default: m.TodoWidget })));
const CountdownWidget = lazy(() => import("./CountdownWidget").then(m => ({ default: m.CountdownWidget })));
const HabitTrackerWidget = lazy(() => import("./HabitTrackerWidget").then(m => ({ default: m.HabitTrackerWidget })));
const TagCloudWidget = lazy(() => import("./TagCloudWidget").then(m => ({ default: m.TagCloudWidget })));
const RandomLinkWidget = lazy(() => import("./RandomLinkWidget").then(m => ({ default: m.RandomLinkWidget })));
const GitHubActivityWidget = lazy(() => import("./GitHubActivityWidget").then(m => ({ default: m.GitHubActivityWidget })));
const BookmarkGrowthWidget = lazy(() => import("./BookmarkGrowthWidget").then(m => ({ default: m.BookmarkGrowthWidget })));
const RSSFeedWidget = lazy(() => import("./RSSFeedWidget").then(m => ({ default: m.RSSFeedWidget })));
const ReadingStreakWidget = lazy(() => import("./ReadingStreakWidget").then(m => ({ default: m.ReadingStreakWidget })));
const GitHubTrendingWidget = lazy(() => import("./GithubTrendingWidget").then(m => ({ default: m.GitHubTrendingWidget })));
const SteamGamesWidget = lazy(() => import("./SteamGamesWidget").then(m => ({ default: m.SteamGamesWidget })));
const NintendoDealsWidget = lazy(() => import("./NintendoDealsWidget").then(m => ({ default: m.NintendoDealsWidget })));
const GithubSearchWidget = lazy(() => import("./GithubSearchWidget").then(m => ({ default: m.GithubSearchWidget })));
const CodePenWidget = lazy(() => import("./CodePenWidget").then(m => ({ default: m.CodePenWidget })));
const SpotifyWidget = lazy(() => import("./SpotifyWidget").then(m => ({ default: m.SpotifyWidget })));
const YouTubeWidget = lazy(() => import("./YouTubeWidget").then(m => ({ default: m.YouTubeWidget })));
const CryptoWidget = lazy(() => import("./CryptoWidget").then(m => ({ default: m.CryptoWidget })));
const WorldClockWidget = lazy(() => import("./WorldClockWidget").then(m => ({ default: m.WorldClockWidget })));
const ColorPaletteWidget = lazy(() => import("./ColorPaletteWidget").then(m => ({ default: m.ColorPaletteWidget })));
const UnsplashWidget = lazy(() => import("./UnsplashWidget").then(m => ({ default: m.UnsplashWidget })));
const QRCodeWidget = lazy(() => import("./QRCodeWidget").then(m => ({ default: m.QRCodeWidget })));
const WebsiteMonitorWidget = lazy(() => import("./WebsiteMonitorWidget").then(m => ({ default: m.WebsiteMonitorWidget })));
const EmbedWidget = lazy(() => import("./EmbedWidget").then(m => ({ default: m.EmbedWidget })));
const PromptWidget = lazy(() => import("./PromptWidget").then(m => ({ default: m.PromptWidget })));
const PromptBuilderWidget = lazy(() => import("./PromptBuilderWidget").then(m => ({ default: m.PromptBuilderWidget })));
const MCPExplorerWidget = lazy(() => import("./MCPExplorerWidget").then(m => ({ default: m.MCPExplorerWidget })));
const DeploymentStatusWidget = lazy(() => import("./DeploymentStatusWidget").then(m => ({ default: m.DeploymentStatusWidget })));
const VoiceNotesWidget = lazy(() => import("./VoiceNotesWidget").then(m => ({ default: m.VoiceNotesWidget })));
const LinkManagerWidget = lazy(() => import("./LinkManagerWidget").then(m => ({ default: m.LinkManagerWidget })));
// Social/News Feed widgets
const TwitterFeedWidget = lazy(() => import("./TwitterFeedWidget").then(m => ({ default: m.TwitterFeedWidget })));
const RedditWidget = lazy(() => import("./RedditWidget").then(m => ({ default: m.RedditWidget })));
const HackerNewsWidget = lazy(() => import("./HackerNewsWidget").then(m => ({ default: m.HackerNewsWidget })));
const ProductHuntWidget = lazy(() => import("./ProductHuntWidget").then(m => ({ default: m.ProductHuntWidget })));
const DevToFeedWidget = lazy(() => import("./DevToFeedWidget").then(m => ({ default: m.DevToFeedWidget })));
// Utility widgets
const CalculatorWidget = lazy(() => import("./CalculatorWidget").then(m => ({ default: m.CalculatorWidget })));
const StopwatchWidget = lazy(() => import("./StopwatchWidget").then(m => ({ default: m.StopwatchWidget })));
const JSONFormatterWidget = lazy(() => import("./JSONFormatterWidget").then(m => ({ default: m.JSONFormatterWidget })));
const Base64ToolWidget = lazy(() => import("./Base64ToolWidget").then(m => ({ default: m.Base64ToolWidget })));
const TextToolsWidget = lazy(() => import("./TextToolsWidget").then(m => ({ default: m.TextToolsWidget })));
const PasswordGeneratorWidget = lazy(() => import("./PasswordGeneratorWidget").then(m => ({ default: m.PasswordGeneratorWidget })));
const LoremIpsumWidget = lazy(() => import("./LoremIpsumWidget").then(m => ({ default: m.LoremIpsumWidget })));
const DiceRollerWidget = lazy(() => import("./DiceRollerWidget").then(m => ({ default: m.DiceRollerWidget })));
// Developer/Converter widgets
const UnitConverterWidget = lazy(() => import("./UnitConverterWidget").then(m => ({ default: m.UnitConverterWidget })));
const CurrencyConverterWidget = lazy(() => import("./CurrencyConverterWidget").then(m => ({ default: m.CurrencyConverterWidget })));
const MarkdownPreviewWidget = lazy(() => import("./MarkdownPreviewWidget").then(m => ({ default: m.MarkdownPreviewWidget })));
const RegexTesterWidget = lazy(() => import("./RegexTesterWidget").then(m => ({ default: m.RegexTesterWidget })));
const ColorConverterWidget = lazy(() => import("./ColorConverterWidget").then(m => ({ default: m.ColorConverterWidget })));
const TimezoneConverterWidget = lazy(() => import("./TimezoneConverterWidget").then(m => ({ default: m.TimezoneConverterWidget })));
const HashGeneratorWidget = lazy(() => import("./HashGeneratorWidget").then(m => ({ default: m.HashGeneratorWidget })));
const IPInfoWidget = lazy(() => import("./IPInfoWidget").then(m => ({ default: m.IPInfoWidget })));
// Generator/Calculator widgets
const UUIDGeneratorWidget = lazy(() => import("./UUIDGeneratorWidget").then(m => ({ default: m.UUIDGeneratorWidget })));
const NumberConverterWidget = lazy(() => import("./NumberConverterWidget").then(m => ({ default: m.NumberConverterWidget })));
const GradientGeneratorWidget = lazy(() => import("./GradientGeneratorWidget").then(m => ({ default: m.GradientGeneratorWidget })));
const BoxShadowGeneratorWidget = lazy(() => import("./BoxShadowGeneratorWidget").then(m => ({ default: m.BoxShadowGeneratorWidget })));
const TextShadowWidget = lazy(() => import("./TextShadowWidget").then(m => ({ default: m.TextShadowWidget })));
const AspectRatioWidget = lazy(() => import("./AspectRatioWidget").then(m => ({ default: m.AspectRatioWidget })));
const JWTDecoderWidget = lazy(() => import("./JWTDecoderWidget").then(m => ({ default: m.JWTDecoderWidget })));
const AgeCalculatorWidget = lazy(() => import("./AgeCalculatorWidget").then(m => ({ default: m.AgeCalculatorWidget })));
const WordCounterWidget = lazy(() => import("./WordCounterWidget").then(m => ({ default: m.WordCounterWidget })));
const SVGWaveWidget = lazy(() => import("./SVGWaveWidget").then(m => ({ default: m.SVGWaveWidget })));
const ContrastCheckerWidget = lazy(() => import("./ContrastCheckerWidget").then(m => ({ default: m.ContrastCheckerWidget })));
const SpacingCalculatorWidget = lazy(() => import("./SpacingCalculatorWidget").then(m => ({ default: m.SpacingCalculatorWidget })));
const TypographyScaleWidget = lazy(() => import("./TypographyScaleWidget").then(m => ({ default: m.TypographyScaleWidget })));
const StateMachineWidget = lazy(() => import("./StateMachineWidget").then(m => ({ default: m.StateMachineWidget })));
const CSSGridWidget = lazy(() => import("./CSSGridWidget").then(m => ({ default: m.CSSGridWidget })));
const FlexboxPlaygroundWidget = lazy(() => import("./FlexboxPlaygroundWidget").then(m => ({ default: m.FlexboxPlaygroundWidget })));
const GlassmorphismWidget = lazy(() => import("./GlassmorphismWidget").then(m => ({ default: m.GlassmorphismWidget })));
const NeumorphismWidget = lazy(() => import("./NeumorphismWidget").then(m => ({ default: m.NeumorphismWidget })));
const CSSAnimationWidget = lazy(() => import("./CSSAnimationWidget").then(m => ({ default: m.CSSAnimationWidget })));
const TailwindColorWidget = lazy(() => import("./TailwindColorWidget").then(m => ({ default: m.TailwindColorWidget })));
const CSSFilterWidget = lazy(() => import("./CSSFilterWidget").then(m => ({ default: m.CSSFilterWidget })));
const CSSTransformWidget = lazy(() => import("./CSSTransformWidget").then(m => ({ default: m.CSSTransformWidget })));
const ClipPathWidget = lazy(() => import("./ClipPathWidget").then(m => ({ default: m.ClipPathWidget })));
const ParticleSystemWidget = lazy(() => import("./ParticleSystemWidget").then(m => ({ default: m.ParticleSystemWidget })));
const TilemapWidget = lazy(() => import("./TilemapWidget").then(m => ({ default: m.TilemapWidget })));
const GameMathWidget = lazy(() => import("./GameMathWidget").then(m => ({ default: m.GameMathWidget })));
const SpriteSheetWidget = lazy(() => import("./SpritesheetWidget").then(m => ({ default: m.SpriteSheetWidget })));
const EasingFunctionsWidget = lazy(() => import("./EasingFunctionsWidget").then(m => ({ default: m.EasingFunctionsWidget })));
const PixelArtWidget = lazy(() => import("./PixelArtWidget").then(m => ({ default: m.PixelArtWidget })));
const ColorRampWidget = lazy(() => import("./ColorRampWidget").then(m => ({ default: m.ColorRampWidget })));
const NoiseGeneratorWidget = lazy(() => import("./NoiseGeneratorWidget").then(m => ({ default: m.NoiseGeneratorWidget })));
const ScreenResolutionWidget = lazy(() => import("./ScreenResolutionWidget").then(m => ({ default: m.ScreenResolutionWidget })));
const BezierCurveWidget = lazy(() => import("./BezierCurveWidget").then(m => ({ default: m.BezierCurveWidget })));
const RPGStatsWidget = lazy(() => import("./RPGStatsWidget").then(m => ({ default: m.RPGStatsWidget })));
const DamageCalculatorWidget = lazy(() => import("./DamageCalculatorWidget").then(m => ({ default: m.DamageCalculatorWidget })));
const FrameRateWidget = lazy(() => import("./FrameRateWidget").then(m => ({ default: m.FrameRateWidget })));
const LootTableWidget = lazy(() => import("./LootTableWidget").then(m => ({ default: m.LootTableWidget })));
const HitboxEditorWidget = lazy(() => import("./HitboxEditorWidget").then(m => ({ default: m.HitboxEditorWidget })));
const QuestDesignerWidget = lazy(() => import("./QuestDesignerWidget").then(m => ({ default: m.QuestDesignerWidget })));
const BehaviorTreeWidget = lazy(() => import("./BehaviorTreeWidget").then(m => ({ default: m.BehaviorTreeWidget })));
const DialogueTreeWidget = lazy(() => import("./DialogueTreeWidget").then(m => ({ default: m.DialogueTreeWidget })));
const PhysicsPlaygroundWidget = lazy(() => import("./PhysicsPlaygroundWidget").then(m => ({ default: m.PhysicsPlaygroundWidget })));
const InputMapperWidget = lazy(() => import("./InputMapperWidget").then(m => ({ default: m.InputMapperWidget })));
const PathfindingWidget = lazy(() => import("./PathfindingWidget").then(m => ({ default: m.PathfindingWidget })));
const WaveSpawnerWidget = lazy(() => import("./WaveSpawnerWidget").then(m => ({ default: m.WaveSpawnerWidget })));
const HealthBarWidget = lazy(() => import("./HealthBarWidget").then(m => ({ default: m.HealthBarWidget })));
const InventoryGridWidget = lazy(() => import("./InventoryGridWidget").then(m => ({ default: m.InventoryGridWidget })));
const LevelProgressWidget = lazy(() => import("./LevelProgressWidget").then(m => ({ default: m.LevelProgressWidget })));
const NameGeneratorWidget = lazy(() => import("./NameGeneratorWidget").then(m => ({ default: m.NameGeneratorWidget })));
const SkillTreeWidget = lazy(() => import("./SkillTreeWidget").then(m => ({ default: m.SkillTreeWidget })));
const CameraShakeWidget = lazy(() => import("./CameraShakeWidget").then(m => ({ default: m.CameraShakeWidget })));
const AchievementWidget = lazy(() => import("./AchievementWidget").then(m => ({ default: m.AchievementWidget })));
// Organization & Productivity widgets for Design & Development
const DesignTokensWidget = lazy(() => import("./DesignTokensWidget").then(m => ({ default: m.DesignTokensWidget })));
const CodeSnippetsWidget = lazy(() => import("./CodeSnippetsWidget"));
const SprintTasksWidget = lazy(() => import("./SprintTasksWidget").then(m => ({ default: m.SprintTasksWidget })));
const DecisionLogWidget = lazy(() => import("./DecisionLogWidget").then(m => ({ default: m.DecisionLogWidget })));
const EisenhowerMatrixWidget = lazy(() => import("./EisenhowerMatrixWidget").then(m => ({ default: m.EisenhowerMatrixWidget })));
const StandupNotesWidget = lazy(() => import("./StandupNotesWidget").then(m => ({ default: m.StandupNotesWidget })));
const MoodBoardWidget = lazy(() => import("./MoodBoardWidget"));
const APIReferenceWidget = lazy(() => import("./APIReferenceWidget"));
const MeetingNotesWidget = lazy(() => import("./MeetingNotesWidget").then(m => ({ default: m.MeetingNotesWidget })));
const WeeklyGoalsWidget = lazy(() => import("./WeeklyGoalsWidget").then(m => ({ default: m.WeeklyGoalsWidget })));
const ParkingLotWidget = lazy(() => import("./ParkingLotWidget"));
const PRChecklistWidget = lazy(() => import("./PRChecklistWidget"));
const TechDebtWidget = lazy(() => import("./TechDebtWidget").then(m => ({ default: m.TechDebtWidget })));
const ProjectTimelineWidget = lazy(() => import("./ProjectTimelineWidget"));
const ComponentDocsWidget = lazy(() => import("./ComponentDocsWidget").then(m => ({ default: m.ComponentDocsWidget })));
const WireframeWidget = lazy(() => import("./WireframeWidget").then(m => ({ default: m.WireframeWidget })));
const DesignReviewWidget = lazy(() => import("./DesignReviewWidget").then(m => ({ default: m.DesignReviewWidget })));
const EnvVarsWidget = lazy(() => import("./EnvVarsWidget"));
const GitCommandsWidget = lazy(() => import("./GitCommandsWidget").then(m => ({ default: m.GitCommandsWidget })));
const ShadcnBuilderWidget = lazy(() => import("./ShadcnBuilderWidget").then(m => ({ default: m.ShadcnBuilderWidget })));
// Personal Finance widgets
const ExpenseTrackerWidget = lazy(() => import("./ExpenseTrackerWidget").then(m => ({ default: m.ExpenseTrackerWidget })));
const BudgetProgressWidget = lazy(() => import("./BudgetProgressWidget").then(m => ({ default: m.BudgetProgressWidget })));
const SavingsGoalWidget = lazy(() => import("./SavingsGoalWidget").then(m => ({ default: m.SavingsGoalWidget })));
const SubscriptionManagerWidget = lazy(() => import("./SubscriptionManagerWidget").then(m => ({ default: m.SubscriptionManagerWidget })));
// AI & Intelligence widgets
const AIChatWidget = lazy(() => import("./AIChatWidget").then(m => ({ default: m.AIChatWidget })));
const AIDailySummaryWidget = lazy(() => import("./AIDailySummaryWidget").then(m => ({ default: m.AIDailySummaryWidget })));
const SmartSuggestionsWidget = lazy(() => import("./SmartSuggestionsWidget").then(m => ({ default: m.SmartSuggestionsWidget })));
// Entertainment & Media widgets
const MovieTrackerWidget = lazy(() => import("./MovieTrackerWidget").then(m => ({ default: m.MovieTrackerWidget })));
const BookTrackerWidget = lazy(() => import("./BookTrackerWidget").then(m => ({ default: m.BookTrackerWidget })));
const AnimeListWidget = lazy(() => import("./AnimeListWidget").then(m => ({ default: m.AnimeListWidget })));
const GameBacklogWidget = lazy(() => import("./GameBacklogWidget").then(m => ({ default: m.GameBacklogWidget })));
const WishlistWidget = lazy(() => import("./WishlistWidget").then(m => ({ default: m.WishlistWidget })));
// Wellness & Life Tracking widgets
const MoodTrackerWidget = lazy(() => import("./MoodTrackerWidget").then(m => ({ default: m.MoodTrackerWidget })));
const WaterIntakeWidget = lazy(() => import("./WaterIntakeWidget").then(m => ({ default: m.WaterIntakeWidget })));
const SleepLogWidget = lazy(() => import("./SleepLogWidget").then(m => ({ default: m.SleepLogWidget })));
const BreathingExerciseWidget = lazy(() => import("./BreathingExerciseWidget").then(m => ({ default: m.BreathingExerciseWidget })));
const GratitudeJournalWidget = lazy(() => import("./GratitudeJournalWidget").then(m => ({ default: m.GratitudeJournalWidget })));
const DailyAffirmationsWidget = lazy(() => import("./DailyAffirmationsWidget").then(m => ({ default: m.DailyAffirmationsWidget })));
// Design/Creativity widgets
const ColorOfDayWidget = lazy(() => import("./ColorOfDayWidget").then(m => ({ default: m.ColorOfDayWidget })));
const FontPairingWidget = lazy(() => import("./FontPairingWidget").then(m => ({ default: m.FontPairingWidget })));
const DesignInspirationWidget = lazy(() => import("./DesignInspirationWidget").then(m => ({ default: m.DesignInspirationWidget })));
const IconPickerWidget = lazy(() => import("./IconPickerWidget").then(m => ({ default: m.IconPickerWidget })));
const ScreenshotMockupWidget = lazy(() => import("./ScreenshotMockupWidget").then(m => ({ default: m.ScreenshotMockupWidget })));
// Productivity Extended widgets
const FocusScoreWidget = lazy(() => import("./FocusScoreWidget").then(m => ({ default: m.FocusScoreWidget })));
const TimeBlockingWidget = lazy(() => import("./TimeBlockingWidget").then(m => ({ default: m.TimeBlockingWidget })));
const DailyReviewWidget = lazy(() => import("./DailyReviewWidget").then(m => ({ default: m.DailyReviewWidget })));
const EnergyTrackerWidget = lazy(() => import("./EnergyTrackerWidget").then(m => ({ default: m.EnergyTrackerWidget })));
const ParkingLotEnhancedWidget = lazy(() => import("./ParkingLotEnhancedWidget").then(m => ({ default: m.ParkingLotEnhancedWidget })));
// Utility Extended widgets
const ClipboardHistoryWidget = lazy(() => import("./ClipboardHistoryWidget").then(m => ({ default: m.ClipboardHistoryWidget })));
const StickyNotesWidget = lazy(() => import("./StickyNotesWidget").then(m => ({ default: m.StickyNotesWidget })));
const LinkPreviewerWidget = lazy(() => import("./LinkPreviewerWidget").then(m => ({ default: m.LinkPreviewerWidget })));
const SiteStatusMonitorWidget = lazy(() => import("./SiteStatusMonitorWidget").then(m => ({ default: m.SiteStatusMonitorWidget })));
const APITesterWidget = lazy(() => import("./APITesterWidget").then(m => ({ default: m.APITesterWidget })));
const CronBuilderWidget = lazy(() => import("./CronBuilderWidget").then(m => ({ default: m.CronBuilderWidget })));
const DiffViewerWidget = lazy(() => import("./DiffViewerWidget").then(m => ({ default: m.DiffViewerWidget })));
const PasswordManagerWidget = lazy(() => import("./PasswordManagerWidget").then(m => ({ default: m.PasswordManagerWidget })));

// Map of widget types to their lazy components
const widgetMap: Record<string, LazyWidgetComponent> = {
  clock: ClockWidget,
  stats: StatsWidget,
  "link-analytics": LinkAnalyticsWidget,
  notes: NotesWidget,
  "quick-add": QuickAddWidget,
  progress: ProgressWidget,
  weather: WeatherWidget,
  quote: QuoteWidget,
  pomodoro: PomodoroWidget,
  calendar: CalendarWidget,
  custom: CustomWidget,
  search: SearchWidget,
  bookmarks: BookmarksWidget,
  image: ImageWidget,
  todo: TodoWidget,
  countdown: CountdownWidget,
  "habit-tracker": HabitTrackerWidget,
  "tag-cloud": TagCloudWidget,
  "random-link": RandomLinkWidget,
  "github-activity": GitHubActivityWidget,
  "bookmark-growth": BookmarkGrowthWidget,
  "rss-feed": RSSFeedWidget,
  "reading-streak": ReadingStreakWidget,
  "github-trending": GitHubTrendingWidget,
  "steam-games": SteamGamesWidget,
  "nintendo-deals": NintendoDealsWidget,
  "github-search": GithubSearchWidget,
  codepen: CodePenWidget,
  spotify: SpotifyWidget,
  youtube: YouTubeWidget,
  crypto: CryptoWidget,
  "world-clock": WorldClockWidget,
  "color-palette": ColorPaletteWidget,
  unsplash: UnsplashWidget,
  "qr-code": QRCodeWidget,
  "website-monitor": WebsiteMonitorWidget,
  embed: EmbedWidget,
  prompt: PromptWidget,
  "prompt-builder": PromptBuilderWidget,
  "mcp-explorer": MCPExplorerWidget,
  "deployment-status": DeploymentStatusWidget,
  "voice-notes": VoiceNotesWidget,
  "link-manager": LinkManagerWidget,
  // Social/News Feed widgets
  "twitter-feed": TwitterFeedWidget,
  "reddit": RedditWidget,
  "reddit-widget": RedditWidget,
  "hacker-news": HackerNewsWidget,
  "product-hunt": ProductHuntWidget,
  "devto-feed": DevToFeedWidget,
  // Utility widgets
  calculator: CalculatorWidget,
  stopwatch: StopwatchWidget,
  "json-formatter": JSONFormatterWidget,
  "base64-tool": Base64ToolWidget,
  "text-tools": TextToolsWidget,
  "password-generator": PasswordGeneratorWidget,
  "lorem-ipsum": LoremIpsumWidget,
  "dice-roller": DiceRollerWidget,
  // Developer/Converter widgets
  "unit-converter": UnitConverterWidget,
  "currency-converter": CurrencyConverterWidget,
  "markdown-preview": MarkdownPreviewWidget,
  "regex-tester": RegexTesterWidget,
  "color-converter": ColorConverterWidget,
  "timezone-converter": TimezoneConverterWidget,
  "hash-generator": HashGeneratorWidget,
  "ip-info": IPInfoWidget,
  // Generator/Calculator widgets
  "uuid-generator": UUIDGeneratorWidget,
  "number-converter": NumberConverterWidget,
  "gradient-generator": GradientGeneratorWidget,
  "box-shadow-generator": BoxShadowGeneratorWidget,
  "text-shadow-generator": TextShadowWidget,
  "aspect-ratio": AspectRatioWidget,
  "jwt-decoder": JWTDecoderWidget,
  "age-calculator": AgeCalculatorWidget,
  "word-counter": WordCounterWidget,
  "svg-wave": SVGWaveWidget,
  "contrast-checker": ContrastCheckerWidget,
  "spacing-calculator": SpacingCalculatorWidget,
  "typography-scale": TypographyScaleWidget,
  "state-machine": StateMachineWidget,
  "css-grid": CSSGridWidget,
  "flexbox-playground": FlexboxPlaygroundWidget,
  "glassmorphism": GlassmorphismWidget,
  "neumorphism": NeumorphismWidget,
  "css-animation": CSSAnimationWidget,
  "tailwind-colors": TailwindColorWidget,
  "css-filter": CSSFilterWidget,
  "css-transform": CSSTransformWidget,
  "clip-path-generator": ClipPathWidget,
  "particle-system": ParticleSystemWidget,
  "easing-functions": EasingFunctionsWidget,
  "tilemap": TilemapWidget,
  "tilemap-editor": TilemapWidget,
  "sprite-sheet": SpriteSheetWidget,
  "game-math": GameMathWidget,
  "pixel-art": PixelArtWidget,
  "color-ramp": ColorRampWidget,
  "noise-generator": NoiseGeneratorWidget,
  "screen-resolution": ScreenResolutionWidget,
  "bezier-curve": BezierCurveWidget,
  "rpg-stats": RPGStatsWidget,
  "damage-calculator": DamageCalculatorWidget,
  "frame-rate": FrameRateWidget,
  "loot-table": LootTableWidget,
  "hitbox-editor": HitboxEditorWidget,
  "quest-designer": QuestDesignerWidget,
  "behavior-tree": BehaviorTreeWidget,
  "dialogue-tree": DialogueTreeWidget,
  "physics-playground": PhysicsPlaygroundWidget,
  "input-mapper": InputMapperWidget,
  "pathfinding": PathfindingWidget,
  "wave-spawner": WaveSpawnerWidget,
  "health-bar": HealthBarWidget,
  "inventory-grid": InventoryGridWidget,
  "level-progress": LevelProgressWidget,
  "name-generator": NameGeneratorWidget,
  "skill-tree": SkillTreeWidget,
  "camera-shake": CameraShakeWidget,
  "achievement": AchievementWidget,
  // Organization & Productivity widgets
  "design-tokens": DesignTokensWidget,
  "code-snippets": CodeSnippetsWidget,
  "sprint-tasks": SprintTasksWidget,
  "decision-log": DecisionLogWidget,
  "eisenhower-matrix": EisenhowerMatrixWidget,
  "standup-notes": StandupNotesWidget,
  "mood-board": MoodBoardWidget,
  "api-reference": APIReferenceWidget,
  "meeting-notes": MeetingNotesWidget,
  "weekly-goals": WeeklyGoalsWidget,
  "parking-lot": ParkingLotWidget,
  "pr-checklist": PRChecklistWidget,
  "tech-debt": TechDebtWidget,
  "project-timeline": ProjectTimelineWidget,
  "component-docs": ComponentDocsWidget,
  "wireframe": WireframeWidget,
  "design-review": DesignReviewWidget,
  "env-vars": EnvVarsWidget,
  "git-commands": GitCommandsWidget,
  "shadcn-builder": ShadcnBuilderWidget,
  // Personal Finance widgets
  "expense-tracker": ExpenseTrackerWidget,
  "budget-progress": BudgetProgressWidget,
  "savings-goal": SavingsGoalWidget,
  "subscription-manager": SubscriptionManagerWidget,
  // AI & Intelligence widgets
  "ai-chat": AIChatWidget,
  "ai-daily-summary": AIDailySummaryWidget,
  "smart-suggestions": SmartSuggestionsWidget,
  // Entertainment & Media widgets
  "movie-tracker": MovieTrackerWidget,
  "book-tracker": BookTrackerWidget,
  "anime-list": AnimeListWidget,
  "game-backlog": GameBacklogWidget,
  "wishlist": WishlistWidget,
  // Wellness & Life Tracking widgets
  "mood-tracker": MoodTrackerWidget,
  "water-intake": WaterIntakeWidget,
  "sleep-log": SleepLogWidget,
  "breathing-exercise": BreathingExerciseWidget,
  "gratitude-journal": GratitudeJournalWidget,
  "daily-affirmations": DailyAffirmationsWidget,
  // Design/Creativity widgets
  "color-of-day": ColorOfDayWidget,
  "font-pairing": FontPairingWidget,
  "design-inspiration": DesignInspirationWidget,
  "icon-picker": IconPickerWidget,
  "screenshot-mockup": ScreenshotMockupWidget,
  // Productivity Extended widgets
  "focus-score": FocusScoreWidget,
  "time-blocking": TimeBlockingWidget,
  "daily-review": DailyReviewWidget,
  "energy-tracker": EnergyTrackerWidget,
  "parking-lot-enhanced": ParkingLotEnhancedWidget,
  // Utility Extended widgets
  "clipboard-history": ClipboardHistoryWidget,
  "sticky-notes": StickyNotesWidget,
  "link-previewer": LinkPreviewerWidget,
  "site-status": SiteStatusMonitorWidget,
  "api-tester": APITesterWidget,
  "cron-builder": CronBuilderWidget,
  "diff-viewer": DiffViewerWidget,
  "password-manager": PasswordManagerWidget,
};

// Skeleton variant mapping based on widget type
function getSkeletonVariant(widgetType: string): "list" | "stats" | "clock" | "notes" | "default" {
  switch (widgetType) {
    case "clock":
    case "world-clock":
    case "calculator":
    case "stopwatch":
    case "dice-roller":
    case "password-generator":
    case "color-converter":
    case "unit-converter":
    case "currency-converter":
    case "timezone-converter":
    case "ip-info":
    case "uuid-generator":
    case "number-converter":
    case "aspect-ratio":
    case "age-calculator":
    case "contrast-checker":
    case "spacing-calculator":
    case "typography-scale":
      return "clock";
    case "stats":
    case "link-analytics":
    case "bookmark-growth":
      return "stats";
    case "notes":
    case "todo":
    case "custom":
    case "prompt":
    case "prompt-builder":
    case "json-formatter":
    case "base64-tool":
    case "text-tools":
    case "lorem-ipsum":
    case "markdown-preview":
    case "regex-tester":
    case "hash-generator":
    case "gradient-generator":
    case "box-shadow-generator":
    case "text-shadow-generator":
    case "jwt-decoder":
    case "word-counter":
    case "svg-wave":
    case "state-machine":
    case "css-grid":
    case "flexbox-playground":
    case "glassmorphism":
    case "neumorphism":
    case "css-animation":
    case "tailwind-colors":
    case "css-filter":
    case "css-transform":
    case "clip-path-generator":
    case "particle-system":
    case "easing-functions":
    case "tilemap":
    case "tilemap-editor":
    case "sprite-sheet":
    case "pixel-art":
    case "game-math":
    case "color-ramp":
    case "noise-generator":
    case "screen-resolution":
    case "bezier-curve":
    case "rpg-stats":
    case "damage-calculator":
    case "frame-rate":
    case "loot-table":
    case "hitbox-editor":
    case "quest-designer":
    case "behavior-tree":
    case "dialogue-tree":
    case "wave-spawner":
    case "health-bar":
    case "inventory-grid":
    case "level-progress":
    case "name-generator":
    case "skill-tree":
    case "camera-shake":
    case "achievement":
    case "physics-playground":
    case "pathfinding":
    case "input-mapper":
    // Organization & Productivity widgets
    case "design-tokens":
    case "code-snippets":
    case "sprint-tasks":
    case "decision-log":
    case "eisenhower-matrix":
    case "standup-notes":
    case "mood-board":
    case "api-reference":
    case "meeting-notes":
    case "weekly-goals":
    case "parking-lot":
    case "pr-checklist":
    case "tech-debt":
    case "project-timeline":
    case "component-docs":
    case "wireframe":
    case "design-review":
    case "env-vars":
    case "git-commands":
    case "shadcn-builder":
    // Personal Finance widgets
    case "expense-tracker":
    case "budget-progress":
    case "savings-goal":
    case "subscription-manager":
    // AI & Intelligence widgets
    case "ai-chat":
    case "ai-daily-summary":
    case "smart-suggestions":
    // Entertainment & Media widgets
    case "movie-tracker":
    case "book-tracker":
    case "anime-list":
    case "game-backlog":
    case "wishlist":
    // Wellness & Life Tracking widgets
    case "mood-tracker":
    case "water-intake":
    case "sleep-log":
    case "breathing-exercise":
    case "gratitude-journal":
    case "daily-affirmations":
    // Design/Creativity widgets
    case "color-of-day":
    case "font-pairing":
    case "design-inspiration":
    case "icon-picker":
    case "screenshot-mockup":
    // Productivity Extended widgets
    case "focus-score":
    case "time-blocking":
    case "daily-review":
    case "energy-tracker":
    case "parking-lot-enhanced":
    // Utility Extended widgets
    case "clipboard-history":
    case "sticky-notes":
    case "link-previewer":
    case "site-status":
    case "api-tester":
    case "cron-builder":
    case "diff-viewer":
    case "password-manager":
      return "notes";
    case "favorites":
    case "recent":
    case "category":
    case "tag":
    case "bookmarks":
    case "rss-feed":
    case "github-activity":
    case "github-trending":
    case "steam-games":
    case "mcp-explorer":
    case "deployment-status":
    case "link-manager":
    // Social/News Feed widgets
    case "twitter-feed":
    case "reddit":
    case "hacker-news":
    case "product-hunt":
    case "devto-feed":
      return "list";
    case "voice-notes":
      return "notes";
    default:
      return "default";
  }
}

interface LazyWidgetRendererProps {
  widget: Widget;
}

export function LazyWidgetRenderer({ widget }: LazyWidgetRendererProps) {
  const WidgetComponent = widgetMap[widget.type];

  if (!WidgetComponent) {
    // Log error in development and show a placeholder
    if (process.env.NODE_ENV === 'development') {
      console.error(`[LazyWidgetRenderer] Unknown widget type: "${widget.type}". Make sure it's registered in widgetMap.`);
    }
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="text-muted-foreground text-sm">
          <p className="font-medium">Widget no disponible</p>
          <p className="text-xs mt-1 opacity-60">Tipo: {widget.type}</p>
        </div>
      </div>
    );
  }

  const skeletonVariant = getSkeletonVariant(widget.type);

  // Some widgets don't need the widget prop (like ClockWidget, StatsWidget)
  const noPropsWidgets = ["clock", "stats", "calendar", "quick-add"];
  const needsWidget = !noPropsWidgets.includes(widget.type);

  return (
    <Suspense fallback={<WidgetSkeleton variant={skeletonVariant} />}>
      {needsWidget ? (
        <WidgetComponent widget={widget} />
      ) : (
        <WidgetComponent />
      )}
    </Suspense>
  );
}

// Export individual lazy components for cases where direct import is needed
export {
  ClockWidget,
  StatsWidget,
  LinkAnalyticsWidget,
  NotesWidget,
  QuickAddWidget,
  ProgressWidget,
  WeatherWidget,
  QuoteWidget,
  PomodoroWidget,
  CalendarWidget,
  CustomWidget,
  SearchWidget,
  BookmarksWidget,
  ImageWidget,
  TodoWidget,
  CountdownWidget,
  HabitTrackerWidget,
  TagCloudWidget,
  RandomLinkWidget,
  GitHubActivityWidget,
  BookmarkGrowthWidget,
  RSSFeedWidget,
  ReadingStreakWidget,
  GitHubTrendingWidget,
  SteamGamesWidget,
  NintendoDealsWidget,
  GithubSearchWidget,
  CodePenWidget,
  SpotifyWidget,
  YouTubeWidget,
  CryptoWidget,
  WorldClockWidget,
  ColorPaletteWidget,
  UnsplashWidget,
  QRCodeWidget,
  WebsiteMonitorWidget,
  EmbedWidget,
  PromptWidget,
  PromptBuilderWidget,
  MCPExplorerWidget,
  DeploymentStatusWidget,
  VoiceNotesWidget,
  LinkManagerWidget,
  // Social/News Feed widgets
  TwitterFeedWidget,
  RedditWidget,
  HackerNewsWidget,
  ProductHuntWidget,
  DevToFeedWidget,
  // Utility widgets
  CalculatorWidget,
  StopwatchWidget,
  JSONFormatterWidget,
  Base64ToolWidget,
  TextToolsWidget,
  PasswordGeneratorWidget,
  LoremIpsumWidget,
  DiceRollerWidget,
  // Developer/Converter widgets
  UnitConverterWidget,
  CurrencyConverterWidget,
  MarkdownPreviewWidget,
  RegexTesterWidget,
  ColorConverterWidget,
  TimezoneConverterWidget,
  HashGeneratorWidget,
  IPInfoWidget,
  // Generator/Calculator widgets
  UUIDGeneratorWidget,
  NumberConverterWidget,
  GradientGeneratorWidget,
  BoxShadowGeneratorWidget,
  TextShadowWidget,
  AspectRatioWidget,
  JWTDecoderWidget,
  AgeCalculatorWidget,
  WordCounterWidget,
  SVGWaveWidget,
  ContrastCheckerWidget,
  SpacingCalculatorWidget,
  TypographyScaleWidget,
  StateMachineWidget,
  CSSGridWidget,
  FlexboxPlaygroundWidget,
  GlassmorphismWidget,
  NeumorphismWidget,
  CSSAnimationWidget,
  TailwindColorWidget,
  CSSFilterWidget,
  CSSTransformWidget,
  ClipPathWidget,
  ParticleSystemWidget,
  EasingFunctionsWidget,
  TilemapWidget,
  SpriteSheetWidget,
  PixelArtWidget,
  GameMathWidget,
  ColorRampWidget,
  NoiseGeneratorWidget,
  ScreenResolutionWidget,
  BezierCurveWidget,
  RPGStatsWidget,
  DamageCalculatorWidget,
  FrameRateWidget,
  LootTableWidget,
  InputMapperWidget,
  HitboxEditorWidget,
  QuestDesignerWidget,
  BehaviorTreeWidget,
  PathfindingWidget,
  PhysicsPlaygroundWidget,
  WaveSpawnerWidget,
  // Organization & Productivity widgets
  DesignTokensWidget,
  CodeSnippetsWidget,
  SprintTasksWidget,
  DecisionLogWidget,
  EisenhowerMatrixWidget,
  StandupNotesWidget,
  MoodBoardWidget,
  APIReferenceWidget,
  MeetingNotesWidget,
  WeeklyGoalsWidget,
  ParkingLotWidget,
  PRChecklistWidget,
  TechDebtWidget,
  ProjectTimelineWidget,
  ComponentDocsWidget,
  WireframeWidget,
  DesignReviewWidget,
  EnvVarsWidget,
  GitCommandsWidget,
  ShadcnBuilderWidget,
  // Personal Finance widgets
  ExpenseTrackerWidget,
  BudgetProgressWidget,
  SavingsGoalWidget,
  SubscriptionManagerWidget,
  // Entertainment & Media widgets
  MovieTrackerWidget,
  BookTrackerWidget,
  AnimeListWidget,
  GameBacklogWidget,
  WishlistWidget,
  // Wellness & Life Tracking widgets
  MoodTrackerWidget,
  WaterIntakeWidget,
  SleepLogWidget,
  BreathingExerciseWidget,
  GratitudeJournalWidget,
  DailyAffirmationsWidget,
  // Design/Creativity widgets
  ColorOfDayWidget,
  FontPairingWidget,
  DesignInspirationWidget,
  IconPickerWidget,
  ScreenshotMockupWidget,
  // Productivity Extended widgets
  FocusScoreWidget,
  TimeBlockingWidget,
  DailyReviewWidget,
  EnergyTrackerWidget,
  ParkingLotEnhancedWidget,
  // Utility Extended widgets
  ClipboardHistoryWidget,
  StickyNotesWidget,
  LinkPreviewerWidget,
  SiteStatusMonitorWidget,
  APITesterWidget,
  CronBuilderWidget,
  DiffViewerWidget,
  PasswordManagerWidget,
};

// List of special widget types that use LazyWidgetRenderer
export const specialWidgetTypes = [
  "clock", "stats", "link-analytics", "notes", "quick-add", "progress",
  "weather", "quote", "pomodoro", "calendar", "custom", "search",
  "bookmarks", "image", "todo", "countdown", "habit-tracker", "tag-cloud",
  "random-link", "github-activity", "bookmark-growth", "rss-feed", "reading-streak",
  "github-trending", "steam-games", "nintendo-deals", "github-search",
  "codepen", "spotify", "youtube", "crypto", "world-clock", "color-palette",
  "unsplash", "qr-code", "website-monitor", "embed", "prompt", "prompt-builder", "mcp-explorer",
  "deployment-status", "voice-notes", "link-manager",
  // Social/News Feed widgets
  "twitter-feed", "reddit", "reddit-widget", "hacker-news", "product-hunt", "devto-feed",
  // Utility widgets
  "calculator", "stopwatch", "json-formatter", "base64-tool", "text-tools",
  "password-generator", "lorem-ipsum", "dice-roller",
  // Developer/Converter widgets
  "unit-converter", "currency-converter", "markdown-preview", "regex-tester",
  "color-converter", "timezone-converter", "hash-generator", "ip-info",
  // Generator/Calculator widgets
  "uuid-generator", "number-converter", "gradient-generator", "box-shadow-generator",
  "text-shadow-generator", "aspect-ratio", "jwt-decoder", "age-calculator", "word-counter",
  "svg-wave", "contrast-checker", "spacing-calculator", "typography-scale", "state-machine", "css-grid", "flexbox-playground",
  "glassmorphism", "neumorphism", "css-animation", "tailwind-colors", "css-filter", "css-transform", "clip-path-generator",
  "particle-system", "easing-functions", "tilemap", "tilemap-editor", "sprite-sheet", "pixel-art",
  // Game Development widgets
  "game-math", "color-ramp", "noise-generator", "screen-resolution", "bezier-curve",
  "rpg-stats", "damage-calculator", "frame-rate", "loot-table", "hitbox-editor", "quest-designer",
  "behavior-tree", "dialogue-tree", "input-mapper", "physics-playground", "pathfinding", "wave-spawner",
  "health-bar", "inventory-grid", "level-progress", "name-generator", "skill-tree", "camera-shake", "achievement",
  // Organization & Productivity widgets
  "design-tokens", "code-snippets", "sprint-tasks", "decision-log", "eisenhower-matrix",
  "standup-notes", "mood-board", "api-reference", "meeting-notes", "weekly-goals",
  "parking-lot", "pr-checklist", "tech-debt", "project-timeline", "component-docs",
  "wireframe", "design-review", "env-vars", "git-commands", "shadcn-builder",
  // Personal Finance widgets
  "expense-tracker", "budget-progress", "savings-goal", "subscription-manager",
  // AI & Intelligence widgets
  "ai-chat", "ai-daily-summary", "smart-suggestions",
  // Entertainment & Media widgets
  "movie-tracker", "book-tracker", "anime-list", "game-backlog", "wishlist",
  // Wellness & Life Tracking widgets
  "mood-tracker", "water-intake", "sleep-log", "breathing-exercise", "gratitude-journal", "daily-affirmations",
  // Design/Creativity widgets
  "color-of-day", "font-pairing", "design-inspiration", "icon-picker", "screenshot-mockup",
  // Productivity Extended widgets
  "focus-score", "time-blocking", "daily-review", "energy-tracker", "parking-lot-enhanced",
  // Utility Extended widgets
  "clipboard-history", "sticky-notes", "link-previewer", "site-status", "api-tester", "cron-builder", "diff-viewer",
  "password-manager",
];
