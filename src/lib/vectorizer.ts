import { Path } from 'opentype.js';

export interface Point {
  x: number;
  y: number;
}

export interface Contour {
  points: Point[];
  isHole: boolean;
}

/**
 * Douglas-Peucker line simplification algorithm.
 * Reduces the number of vertices in a contour while preserving shape fidelity.
 */
export function simplifyPoints(points: Point[], epsilon = 1.0): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lenSq = dx * dx + dy * dy;

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    let dist: number;

    if (lenSq === 0) {
      dist = Math.hypot(p.x - start.x, p.y - start.y);
    } else {
      const t = Math.max(0, Math.min(1, ((p.x - start.x) * dx + (p.y - start.y) * dy) / lenSq));
      const projX = start.x + t * dx;
      const projY = start.y + t * dy;
      dist = Math.hypot(p.x - projX, p.y - projY);
    }

    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyPoints(points.slice(maxIndex), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  }

  return [start, end];
}

/**
 * Traces external and internal contours from a canvas bitmap using Moore-neighbor tracing.
 */
export function traceBitmapContours(canvas: HTMLCanvasElement): Contour[] {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || width === 0 || height === 0) return [];

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1 = solid ink pixel, 0 = background
  const grid = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const isDark = (r + g + b) / 3 < 128;
      grid[y * width + x] = alpha > 50 && isDark ? 1 : 0;
    }
  }

  // 8-neighbor offsets in clockwise order: N, NE, E, SE, S, SW, W, NW
  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

  const visitedBoundaries = new Uint8Array(width * height);
  const contours: Contour[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const val = grid[idx];
      const leftVal = grid[idx - 1];

      // Check for outer boundary: transitioning from 0 to 1
      const isOuter = val === 1 && leftVal === 0 && !visitedBoundaries[idx];
      // Check for inner hole boundary: transitioning from 1 to 0
      const isHole = val === 0 && leftVal === 1 && !visitedBoundaries[idx - 1];

      if (isOuter || isHole) {
        const startX = isOuter ? x : x - 1;
        const startY = y;
        const startIdx = startY * width + startX;

        let currX = startX;
        let currY = startY;
        let dir = isOuter ? 6 : 2; // entry direction

        const rawPoints: Point[] = [{ x: currX, y: currY }];
        visitedBoundaries[startIdx] = 1;

        let steps = 0;
        const maxSteps = width * height;

        while (steps++ < maxSteps) {
          // Look around in clockwise direction for next solid pixel
          let foundNext = false;
          const searchStart = (dir + 5) % 8; // backtrack direction

          for (let i = 0; i < 8; i++) {
            const checkDir = (searchStart + i) % 8;
            const nx = currX + dx[checkDir];
            const ny = currY + dy[checkDir];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (grid[ny * width + nx] === 1) {
                currX = nx;
                currY = ny;
                dir = checkDir;
                foundNext = true;
                break;
              }
            }
          }

          if (!foundNext) break;

          rawPoints.push({ x: currX, y: currY });
          visitedBoundaries[currY * width + currX] = 1;

          if (currX === startX && currY === startY) {
            break;
          }
        }

        if (rawPoints.length >= 4) {
          const simplified = simplifyPoints(rawPoints, 0.75);
          if (simplified.length >= 3) {
            contours.push({
              points: simplified,
              isHole: !isOuter,
            });
          }
        }
      }
    }
  }

  return contours;
}

/**
 * Converts traced contours to an opentype.Path scaled to font units (1000 unitsPerEm).
 */
export function contoursToOpenTypePath(
  contours: Contour[],
  bitmapWidth: number,
  bitmapHeight: number,
  baselineOffsetRatio = 0.85,
  unitsPerEm = 1000,
  leftBearing = 30
): Path {
  const path = new Path();
  if (contours.length === 0 || bitmapHeight === 0) return path;

  // Scale: standard font body height is ~700 font units
  const targetFontHeight = unitsPerEm * 0.72;
  const scale = targetFontHeight / bitmapHeight;

  // Baseline in canvas pixels is at bitmapHeight * baselineOffsetRatio
  const baselinePx = bitmapHeight * baselineOffsetRatio;

  for (const contour of contours) {
    if (contour.points.length < 3) continue;

    // Start point
    const firstP = contour.points[0];
    const fx = Math.round(leftBearing + firstP.x * scale);
    const fy = Math.round((baselinePx - firstP.y) * scale); // Font Y is inverted (up is positive)

    path.moveTo(fx, fy);

    for (let i = 1; i < contour.points.length; i++) {
      const p = contour.points[i];
      const px = Math.round(leftBearing + p.x * scale);
      const py = Math.round((baselinePx - p.y) * scale);
      path.lineTo(px, py);
    }

    path.close();
  }

  return path;
}
