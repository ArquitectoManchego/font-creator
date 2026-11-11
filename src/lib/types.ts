export type Step = 'upload' | 'crop' | 'optimize' | 'input' | 'studio';

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CutPoint {
  x: number;
  y: number;
}

export interface CutStroke {
  id: string;
  points: CutPoint[];
  width: number;
}

export interface OptimizationSettings {
  contrast: number; // -100 to 100
  brightness: number; // -100 to 100
  threshold: number; // 0 to 255 (128 default)
  invert: boolean; // true = dark text on light background
  rotation: number; // degrees -180 to 180
  thicken: number; // 0 to 4 (dilation)
  reduceNoise: number; // 0 to 4 (noise speck filter)
}

export interface GlyphMetrics {
  baselineOffsetRatio: number; // 0 to 1, default ~0.8 (where baseline sits from top)
  leftBearing: number; // in pixels or font units
  rightBearing: number; // in pixels or font units
}

export interface ExtractedCharacter {
  id: string;
  char: string;
  dataUrl: string; // PNG base64
  rawBitmapWidth: number;
  rawBitmapHeight: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isSpeck: boolean; // if small accent or dot
  metrics: GlyphMetrics;
  history?: string[]; // undo history for glyph editor
}

export interface FontProject {
  id: string;
  name: string;
  family: string;
  author: string;
  glyphs: Record<string, ExtractedCharacter>; // keyed by character, e.g. 'A', 'a', '1', 'ñ'
  unitsPerEm: number;
  ascender: number;
  descender: number;
  capHeight: number;
  xHeight: number;
  defaultLetterSpacing: number;
}
