import { PixelData } from './types';

type Pixel = [number, number, number];

const toHex = (value: number): string => value.toString(16).toUpperCase().padStart(2, '0');

const pixelToHex = ([r, g, b]: Pixel): string => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

const distSq = (a: Pixel, b: Pixel): number => {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
};

const validSample = (r: number, g: number, b: number, a: number): boolean => {
  if (a < 32) return false;
  if (r < 12 && g < 12 && b < 12) return false;
  return !(r > 245 && g > 245 && b > 245);
};

const samplePixels = (pixelData: PixelData): Pixel[] => {
  const { rgba, width, height } = pixelData;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 24));
  const samples: Pixel[] = [];

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      const a = rgba[idx + 3];
      if (validSample(r, g, b, a)) {
        samples.push([r, g, b]);
      }
    }
  }

  return samples;
};

const kMeans = (pixels: Pixel[], k: number, maxIter = 8): Pixel[] => {
  const centers: Pixel[] = [];
  if (pixels.length === 0) return centers;

  for (let i = 0; i < k; i += 1) {
    centers.push(pixels[(i * Math.floor(pixels.length / k)) % pixels.length]);
  }

  for (let iter = 0; iter < maxIter; iter += 1) {
    const buckets: Pixel[][] = Array.from({ length: k }, () => []);
    for (const px of pixels) {
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < centers.length; i += 1) {
        const d = distSq(px, centers[i]);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      buckets[best].push(px);
    }

    for (let i = 0; i < k; i += 1) {
      const cluster = buckets[i];
      if (!cluster.length) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      for (const px of cluster) {
        r += px[0];
        g += px[1];
        b += px[2];
      }
      centers[i] = [
        Math.round(r / cluster.length),
        Math.round(g / cluster.length),
        Math.round(b / cluster.length),
      ];
    }
  }

  return centers;
};

const saturation = ([r, g, b]: Pixel): number => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
};

const colorWeight = (color: Pixel, pixels: Pixel[]): number => {
  let count = 0;
  for (const px of pixels) {
    if (distSq(px, color) < 1600) count += 1;
  }
  const satBoost = 1 + saturation(color) * 0.7;
  return count * satBoost;
};

export const extractMainColorAndPalette = (
  pixelData: PixelData,
  paletteSize: number,
): { mainColor: string; palette?: string[] } => {
  const samples = samplePixels(pixelData);
  if (!samples.length) {
    throw new Error('No visible emoji pixels found to extract color.');
  }

  const k = Math.max(2, Math.min(8, paletteSize));
  const centers = kMeans(samples, k);
  const ranked = centers
    .map((color) => ({ color, weight: colorWeight(color, samples) }))
    .sort((a, b) => b.weight - a.weight);

  const mainColor = pixelToHex(ranked[0].color);
  const palette = ranked.slice(0, Math.max(1, paletteSize)).map((item) => pixelToHex(item.color));

  return {
    mainColor,
    palette: paletteSize > 1 ? palette : undefined,
  };
};
