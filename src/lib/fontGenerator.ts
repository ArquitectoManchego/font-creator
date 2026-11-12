import { Font, Glyph, Path } from 'opentype.js';
import JSZip from 'jszip';
import { FontProject } from './types';
import { traceBitmapContours, contoursToOpenTypePath } from './vectorizer';

/**
 * Creates a standard .notdef glyph (a hollow rectangle) required by OpenType specification.
 */
function createNotdefGlyph(): Glyph {
  const path = new Path();
  // Draw an outer rectangle
  path.moveTo(100, 0);
  path.lineTo(100, 700);
  path.lineTo(500, 700);
  path.lineTo(500, 0);
  path.close();

  // Draw inner rectangle (hole)
  path.moveTo(150, 50);
  path.lineTo(450, 50);
  path.lineTo(450, 650);
  path.lineTo(150, 650);
  path.close();

  return new Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 600,
    path,
  });
}

/**
 * Creates a space glyph (unicode 32)
 */
function createSpaceGlyph(advanceWidth = 350): Glyph {
  return new Glyph({
    name: 'space',
    unicode: 32,
    advanceWidth,
    path: new Path(),
  });
}

/**
 * Converts a dataUrl to an HTMLCanvasElement
 */
export async function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }
      resolve(canvas);
    };
    img.src = dataUrl;
  });
}

/**
 * Builds an opentype.Font from the FontProject state.
 */
export async function buildOpenTypeFont(project: FontProject): Promise<Font> {
  const glyphsList: Glyph[] = [
    createNotdefGlyph(),
    createSpaceGlyph(project.defaultLetterSpacing || 350),
  ];

  const unitsPerEm = project.unitsPerEm || 1000;
  const targetFontHeight = unitsPerEm * 0.72;

  // Process all extracted characters
  for (const [char, glyphData] of Object.entries(project.glyphs)) {
    if (!char || !glyphData.dataUrl) continue;

    const charCode = char.charCodeAt(0);
    const canvas = await dataUrlToCanvas(glyphData.dataUrl);

    const contours = traceBitmapContours(canvas);
    const baselineRatio = glyphData.metrics?.baselineOffsetRatio ?? 0.85;
    const leftBearingUnits = Math.round((glyphData.metrics?.leftBearing ?? 10) * (unitsPerEm / 200));
    const rightBearingUnits = Math.round((glyphData.metrics?.rightBearing ?? 10) * (unitsPerEm / 200));

    const path = contoursToOpenTypePath(
      contours,
      canvas.width,
      canvas.height,
      baselineRatio,
      unitsPerEm,
      leftBearingUnits
    );

    const scale = canvas.height > 0 ? targetFontHeight / canvas.height : 1;
    const glyphWidthUnits = Math.round(canvas.width * scale);
    const advanceWidth = Math.max(200, glyphWidthUnits + leftBearingUnits + rightBearingUnits);

    const isUpper = char >= 'A' && char <= 'Z';
    const isLower = char >= 'a' && char <= 'z';
    const isDigit = char >= '0' && char <= '9';
    const glyphName = isUpper
      ? `${char}_cap`
      : isLower
      ? `${char}_low`
      : isDigit
      ? `digit_${char}`
      : `uni${charCode.toString(16).padStart(4, '0')}`;

    const glyph = new Glyph({
      name: glyphName,
      unicode: charCode,
      advanceWidth,
      path,
    });

    glyphsList.push(glyph);
  }

  const font = new Font({
    familyName: project.family || project.name || 'CustomHandmadeFont',
    styleName: 'Regular',
    unitsPerEm: unitsPerEm,
    ascender: project.ascender || 800,
    descender: project.descender || -200,
    glyphs: glyphsList,
  });

  return font;
}

/**
 * Downloads the font as .otf or .ttf file
 */
export async function downloadFontFile(
  project: FontProject,
  format: 'otf' | 'ttf' = 'otf'
): Promise<void> {
  const font = await buildOpenTypeFont(project);
  const safeName = (project.name || 'CustomFont').replace(/[^a-zA-Z0-9_-]/g, '_');
  font.download(`${safeName}.${format}`);
}

/**
 * Creates a dynamic font Blob URL and registers @font-face in the document
 */
export async function registerLiveFontFace(
  project: FontProject,
  fontFaceFamilyName = 'LivePreviewCustomFont'
): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const font = await buildOpenTypeFont(project);
    const buffer = font.toArrayBuffer();
    const blob = new Blob([buffer], { type: 'font/opentype' });
    const fontUrl = URL.createObjectURL(blob);

    const fontFace = new FontFace(fontFaceFamilyName, `url(${fontUrl})`);
    const loadedFace = await fontFace.load();
    document.fonts.add(loadedFace);

    return fontUrl;
  } catch (err) {
    console.warn('Could not register live font face, will use canvas fallback:', err);
    return null;
  }
}

/**
 * Exports all glyphs as SVG and project as JSON in a ZIP package
 */
export async function exportZipPackage(project: FontProject): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(project.name || 'font_project');

  // Add project manifest
  folder?.file('project.json', JSON.stringify(project, null, 2));

  // Add each glyph as SVG
  const svgFolder = folder?.folder('svg_glyphs');
  for (const [char, glyph] of Object.entries(project.glyphs)) {
    const canvas = await dataUrlToCanvas(glyph.dataUrl);
    const contours = traceBitmapContours(canvas);
    const path = contoursToOpenTypePath(contours, canvas.width, canvas.height);

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -200 1000 1000" width="1000" height="1000">
  <path d="${path.toPathData(2)}" fill="#000000" />
</svg>`;

    const safeCharName = char.match(/[a-zA-Z0-9]/) ? char : `char_${char.charCodeAt(0)}`;
    svgFolder?.file(`${safeCharName}.svg`, svgContent);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name || 'font_project'}_glyphs.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
