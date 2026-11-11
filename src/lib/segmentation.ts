import { CutStroke, ExtractedCharacter } from './types';

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Component {
  id: string;
  pixels: { x: number; y: number }[];
  bbox: BBox;
  area: number;
}

/**
 * Renders cut strokes onto a binary mask canvas, splitting connected letters.
 */
export function applyCutStrokesToCanvas(
  binaryCanvas: HTMLCanvasElement,
  cutStrokes: CutStroke[]
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = binaryCanvas.width;
  canvas.height = binaryCanvas.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return binaryCanvas;

  ctx.drawImage(binaryCanvas, 0, 0);

  if (cutStrokes.length === 0) return canvas;

  // Draw separator cuts with pure white (background) to disconnect touching letters
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of cutStrokes) {
    if (stroke.points.length < 2) continue;
    ctx.lineWidth = stroke.width || 4;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }
  ctx.restore();

  return canvas;
}

/**
 * Segments an image into individual letter glyphs using Connected Component Analysis.
 */
export function segmentCharacters(
  binaryCanvas: HTMLCanvasElement,
  cutStrokes: CutStroke[] = []
): ExtractedCharacter[] {
  const preparedCanvas = applyCutStrokesToCanvas(binaryCanvas, cutStrokes);
  const width = preparedCanvas.width;
  const height = preparedCanvas.height;
  const ctx = preparedCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || width === 0 || height === 0) return [];

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Create binary grid: 1 = black ink, 0 = white background
  const total = width * height;
  const grid = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    // Check if pixel is dark (ink)
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const isInk = (r + g + b) / 3 < 128;
    grid[i] = isInk ? 1 : 0;
  }

  // 2. Connected Component Labeling using Two-Pass or Disjoint Set
  const labels = new Int32Array(total).fill(0);
  let nextLabel = 1;
  const parent: number[] = [0];

  function find(i: number): number {
    let root = i;
    while (root !== parent[root]) root = parent[root];
    let curr = i;
    while (curr !== root) {
      const nxt = parent[curr];
      parent[curr] = root;
      curr = nxt;
    }
    return root;
  }

  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  // Pass 1: Labeling with 8-connectivity
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (grid[idx] === 0) continue;

      const neighborLabels: number[] = [];
      // West
      if (x > 0 && grid[idx - 1] === 1) neighborLabels.push(labels[idx - 1]);
      // North
      if (y > 0 && grid[idx - width] === 1) neighborLabels.push(labels[idx - width]);
      // North-West
      if (x > 0 && y > 0 && grid[idx - width - 1] === 1) neighborLabels.push(labels[idx - width - 1]);
      // North-East
      if (x < width - 1 && y > 0 && grid[idx - width + 1] === 1) neighborLabels.push(labels[idx - width + 1]);

      const validNeighbors = neighborLabels.filter((l) => l > 0);

      if (validNeighbors.length === 0) {
        labels[idx] = nextLabel;
        parent[nextLabel] = nextLabel;
        nextLabel++;
      } else {
        const minL = Math.min(...validNeighbors);
        labels[idx] = minL;
        for (const l of validNeighbors) {
          union(l, minL);
        }
      }
    }
  }

  // Pass 2: Resolve root labels and group pixels
  const compMap = new Map<number, Component>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (labels[idx] === 0) continue;
      const root = find(labels[idx]);

      let comp = compMap.get(root);
      if (!comp) {
        comp = {
          id: `comp-${root}`,
          pixels: [],
          bbox: { minX: x, minY: y, maxX: x, maxY: y },
          area: 0,
        };
        compMap.set(root, comp);
      }

      comp.pixels.push({ x, y });
      comp.area++;
      if (x < comp.bbox.minX) comp.bbox.minX = x;
      if (x > comp.bbox.maxX) comp.bbox.maxX = x;
      if (y < comp.bbox.minY) comp.bbox.minY = y;
      if (y > comp.bbox.maxY) comp.bbox.maxY = y;
    }
  }

  const rawComponents = Array.from(compMap.values());
  if (rawComponents.length === 0) return [];

  // 3. Filter tiny dust and calculate statistics
  const heights = rawComponents.map((c) => c.bbox.maxY - c.bbox.minY + 1);
  heights.sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 20;

  // A component is considered a speck if height < 18% of median or area < 20 pixels
  const minValidArea = Math.max(12, medianHeight * 0.5);

  const validComponents = rawComponents.filter((c) => c.area >= minValidArea);
  // Sort from left to right
  validComponents.sort((a, b) => a.bbox.minX - b.bbox.minX);

  // 4. Create ExtractedCharacter for each component
  const characters: ExtractedCharacter[] = validComponents.map((comp, index) => {
    const bw = comp.bbox.maxX - comp.bbox.minX + 1;
    const bh = comp.bbox.maxY - comp.bbox.minY + 1;
    const isSpeck = bh < medianHeight * 0.25 || comp.area < medianHeight * 2;

    // Create standalone letter canvas with 10% padding
    const pad = Math.max(4, Math.round(Math.min(bw, bh) * 0.1));
    const letterCanvas = document.createElement('canvas');
    letterCanvas.width = bw + pad * 2;
    letterCanvas.height = bh + pad * 2;

    const letterCtx = letterCanvas.getContext('2d');
    if (letterCtx) {
      // Background transparent
      letterCtx.clearRect(0, 0, letterCanvas.width, letterCanvas.height);
      const letterImgData = letterCtx.createImageData(letterCanvas.width, letterCanvas.height);
      const ld = letterImgData.data;

      // Fill with black pixels where component exists
      for (const p of comp.pixels) {
        const targetX = p.x - comp.bbox.minX + pad;
        const targetY = p.y - comp.bbox.minY + pad;
        const tidx = (targetY * letterCanvas.width + targetX) * 4;
        ld[tidx] = 20; // R
        ld[tidx + 1] = 20; // G
        ld[tidx + 2] = 20; // B
        ld[tidx + 3] = 255; // Alpha
      }

      letterCtx.putImageData(letterImgData, 0, 0);
    }

    return {
      id: `char-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
      char: '', // To be entered or assigned
      dataUrl: letterCanvas.toDataURL('image/png'),
      rawBitmapWidth: letterCanvas.width,
      rawBitmapHeight: letterCanvas.height,
      bbox: {
        x: comp.bbox.minX,
        y: comp.bbox.minY,
        width: bw,
        height: bh,
      },
      isSpeck,
      metrics: {
        baselineOffsetRatio: 0.85,
        leftBearing: 5,
        rightBearing: 5,
      },
    };
  });

  return characters;
}

/**
 * Merges two extracted characters together (e.g. dot of 'i' or accent with letter base).
 */
export function mergeCharacters(
  baseChar: ExtractedCharacter,
  partChar: ExtractedCharacter
): ExtractedCharacter {
  const minX = Math.min(baseChar.bbox.x, partChar.bbox.x);
  const minY = Math.min(baseChar.bbox.y, partChar.bbox.y);
  const maxX = Math.max(baseChar.bbox.x + baseChar.bbox.width, partChar.bbox.x + partChar.bbox.width);
  const maxY = Math.max(baseChar.bbox.y + baseChar.bbox.height, partChar.bbox.y + partChar.bbox.height);

  const totalWidth = maxX - minX;
  const totalHeight = maxY - minY;

  const pad = 6;
  const canvas = document.createElement('canvas');
  canvas.width = totalWidth + pad * 2;
  canvas.height = totalHeight + pad * 2;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img1 = new Image();
    const img2 = new Image();

    // Synchronous drawing if already decoded or load helper
    img1.src = baseChar.dataUrl;
    img2.src = partChar.dataUrl;

    // Draw base
    const baseOffsetX = baseChar.bbox.x - minX + pad;
    const baseOffsetY = baseChar.bbox.y - minY + pad;
    ctx.drawImage(img1, baseOffsetX, baseOffsetY, baseChar.bbox.width, baseChar.bbox.height);

    // Draw part
    const partOffsetX = partChar.bbox.x - minX + pad;
    const partOffsetY = partChar.bbox.y - minY + pad;
    ctx.drawImage(img2, partOffsetX, partOffsetY, partChar.bbox.width, partChar.bbox.height);
  }

  return {
    ...baseChar,
    bbox: {
      x: minX,
      y: minY,
      width: totalWidth,
      height: totalHeight,
    },
    rawBitmapWidth: canvas.width,
    rawBitmapHeight: canvas.height,
    dataUrl: canvas.toDataURL('image/png'),
    isSpeck: false,
  };
}
