// Sticker type definitions

export interface StickerDefinition {
  id: string;
  filename: string;
  path: string;
  name: string;
  category?: string;
}

export interface PlacedSticker {
  id: string;
  stickerId: string;
  filename: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  zIndex: number;
  opacity: number;
  flipX: boolean;
  flipY: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
  // View context - stickers only appear in the view where they were placed
  viewMode: 'bento' | 'kanban' | 'list';
  // Project context - stickers only appear in the project where they were placed
  projectId: string | null;
  // Widget attachment - when attached, sticker moves with the widget
  attachedToWidgetId?: string;
  // Offset from the widget's top-left corner (in pixels, before scale)
  widgetOffsetX?: number;
  widgetOffsetY?: number;
}

export interface StickerTransform {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  scale?: number;
  opacity?: number;
  flipX?: boolean;
  flipY?: boolean;
  zIndex?: number;
  locked?: boolean;
  viewMode?: 'bento' | 'kanban' | 'list';
  projectId?: string | null;
  attachedToWidgetId?: string;
  widgetOffsetX?: number;
  widgetOffsetY?: number;
}

export interface DraggedSticker {
  sticker: StickerDefinition;
  offsetX: number;
  offsetY: number;
}

export interface StickerBookPage {
  pageNumber: number;
  stickers: StickerDefinition[];
}

// Sticker categories based on common sticker themes
export type StickerCategory =
  | "all"
  | "animals"
  | "food"
  | "nature"
  | "objects"
  | "symbols"
  | "people"
  | "other";

// Sticker size presets
export const STICKER_SIZE_PRESETS = {
  tiny: { width: 32, height: 32 },
  small: { width: 48, height: 48 },
  medium: { width: 72, height: 72 },
  large: { width: 96, height: 96 },
  huge: { width: 128, height: 128 },
} as const;

export type StickerSizePreset = keyof typeof STICKER_SIZE_PRESETS;

// Default sticker configuration (excludes context fields that are set at placement time)
export const DEFAULT_STICKER_CONFIG: Omit<PlacedSticker, "id" | "stickerId" | "filename" | "x" | "y" | "createdAt" | "updatedAt" | "viewMode" | "projectId" | "attachedToWidgetId" | "widgetOffsetX" | "widgetOffsetY"> = {
  width: 72,
  height: 72,
  rotation: 0,
  scale: 1,
  zIndex: 1000,
  opacity: 1,
  flipX: false,
  flipY: false,
  locked: false,
};

// Stickers per page in the flipbook
export const STICKERS_PER_PAGE = 12;
