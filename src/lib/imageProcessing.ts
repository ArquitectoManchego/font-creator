import { OptimizationSettings } from './types';

/**
 * Detects whether the background is dark and text is light.
 * Samples the outer perimeter (likely background) to get the ambient background luminance.
 */
export function detectTextContrast(canvas: HTMLCanvasElement): { isLightOnDark: boolean; bgLuminance: number } {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { isLightOnDark: false, bgLuminance: 255 };

  const { width, height } = canvas;
  if (width === 0 || height === 0) return { isLightOnDark: false, bgLuminance: 255 };

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let perimeterSum = 0;
  let count = 0;

  // Sample top and bottom borders
  for (let x = 0; x < width; x += 2) {
    const topIdx = (0 * width + x) * 4;
    const bottomIdx = ((height - 1) * width + x) * 4;
    perimeterSum += 0.299 * data[topIdx] + 0.587 * data[topIdx + 1] + 0.114 * data[topIdx + 2];
    perimeterSum += 0.299 * data[bottomIdx] + 0.587 * data[bottomIdx + 1] + 0.114 * data[bottomIdx + 2];
    count += 2;
  }

  // Sample left and right borders
  for (let y = 0; y < height; y += 2) {
    const leftIdx = (y * width + 0) * 4;
    const rightIdx = (y * width + (width - 1)) * 4;
    perimeterSum += 0.299 * data[leftIdx] + 0.587 * data[leftIdx + 1] + 0.114 * data[leftIdx + 2];
    perimeterSum += 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];
    count += 2;
  }

  const bgLuminance = count > 0 ? perimeterSum / count : 255;
  // If perimeter luminance is low (< 128), it's light text on dark background
  return {
    isLightOnDark: bgLuminance < 128,
    bgLuminance,
  };
}

/**
 * Calculates Otsu's threshold for optimal binarization.
 */
export function calculateOtsuThreshold(grayData: Uint8Array): number {
  const histogram = new Array(256).fill(0);
  const total = grayData.length;

  for (let i = 0; i < total; i++) {
    histogram[grayData[i]]++;
  }

  let sum = 0;
  for (let t = 0; t < 256; t++) {
    sum += t * histogram[t];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Processes an input canvas with brightness, contrast, inversion, threshold,
 * thickening and noise reduction.
 */
export function applyImageFilters(
  sourceCanvas: HTMLCanvasElement,
  settings: OptimizationSettings
): HTMLCanvasElement {
  const output = document.createElement('canvas');
  output.width = sourceCanvas.width;
  output.height = sourceCanvas.height;

  const ctx = output.getContext('2d', { willReadFrequently: true });
  if (!ctx) return output;

  // Draw source image
  ctx.drawImage(sourceCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, output.width, output.height);
  const data = imgData.data;
  const width = output.width;
  const height = output.height;
  const totalPixels = width * height;

  const contrastFactor =
    (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));

  const gray = new Uint8Array(totalPixels);

  // 1. Convert to grayscale with contrast and brightness
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    let r = data[idx];
    let g = data[idx + 1];
    let b = data[idx + 2];

    // Contrast
    r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
    g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
    b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));

    // Brightness
    r = Math.min(255, Math.max(0, r + settings.brightness));
    g = Math.min(255, Math.max(0, g + settings.brightness));
    b = Math.min(255, Math.max(0, b + settings.brightness));

    // Luminance
    let lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    // Invert if enabled (text should be dark/black, background white)
    if (settings.invert) {
      lum = 255 - lum;
    }

    gray[i] = lum;
  }

  // 2. Binary mask: true = foreground (black ink/letter), false = background (white)
  // Threshold: if pixel < threshold, it is ink (dark)
  const threshold = settings.threshold;
  let binary = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    binary[i] = gray[i] < threshold ? 1 : 0;
  }

  // 3. Thickening (Morphological Dilation on black ink)
  if (settings.thicken > 0) {
    for (let pass = 0; pass < settings.thicken; pass++) {
      const nextBinary = new Uint8Array(binary);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          if (
            binary[idx] === 1 ||
            binary[idx - 1] === 1 ||
            binary[idx + 1] === 1 ||
            binary[idx - width] === 1 ||
            binary[idx + width] === 1
          ) {
            nextBinary[idx] = 1;
          }
        }
      }
      binary = nextBinary;
    }
  }

  // 4. Reduce noise (isolated 1x1 or 2x2 specks)
  if (settings.reduceNoise > 0) {
    const nextBinary = new Uint8Array(binary);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (binary[idx] === 1) {
          const neighbors =
            binary[idx - 1] +
            binary[idx + 1] +
            binary[idx - width] +
            binary[idx + width] +
            binary[idx - width - 1] +
            binary[idx - width + 1] +
            binary[idx + width - 1] +
            binary[idx + width + 1];
          if (neighbors <= settings.reduceNoise) {
            nextBinary[idx] = 0;
          }
        }
      }
    }
    binary = nextBinary;
  }

  // 5. Write back to ImageData (Black ink, transparent background or crisp white/black)
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const isInk = binary[i] === 1;
    // Ink is black (0, 0, 0), background is white (255, 255, 255)
    const val = isInk ? 0 : 255;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
    data[idx + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return output;
}
