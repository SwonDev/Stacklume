// Enhanced color palette widget types for ColorPaletteWidget

export type ColorHarmony =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'split-complementary'
  | 'monochromatic';

export interface ColorValue {
  hex: string;
  rgb: string;
  hsl: string;
  locked: boolean;
}

export interface SavedPalette {
  id: string;
  name: string;
  colors: ColorValue[];
  harmony: ColorHarmony;
  isFavorite: boolean;
  createdAt: string;
}

export interface EnhancedColorPaletteConfig {
  savedPalettes?: SavedPalette[];
  currentColors?: ColorValue[];
  currentHarmony?: ColorHarmony;
  baseColor?: string;
}
