import EmojiMainColorModule from './nativeModule';
import {
  deleteInFlightRequest,
  getInFlightRequest,
  getMemoryCache,
  setInFlightRequest,
  setMemoryCache,
} from './internalState';
import type {
  CacheMode,
  EmojiColorResult,
  GetEmojiColorOptions,
  NativeComputeOptions,
  NativeEmojiColorPayload,
} from './types';

const DEFAULT_RENDER_SIZE = 64;
const DEFAULT_PALETTE_SIZE = 0;
const MAX_PALETTE_SIZE = 8;
const MIN_RENDER_SIZE = 16;
const MAX_RENDER_SIZE = 256;
const ALGORITHM_VERSION = 'v2';
const FALLBACK_SOURCE = 'computed';
const HEX_COLOR_PATTERN = /^#?([0-9a-f]{6})$/i;

export class EmojiColorError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'EmojiColorError';
    if (cause !== undefined) {
      this.cause = cause;
    }
  }

  cause?: unknown;
}

type NormalizedOptions = {
  cache?: CacheMode;
  paletteSize: number;
  renderSize: number;
  fallbackColor?: string;
};

export async function getEmojiColor(
  emoji: string,
  options?: GetEmojiColorOptions,
): Promise<EmojiColorResult> {
  const normalizedOptions = normalizeOptions(options);
  const normalizedEmoji = normalizeEmoji(emoji);

  if (!isLikelyEmoji(normalizedEmoji)) {
    return buildFallbackOrThrow(
      normalizedEmoji,
      normalizedOptions,
      'Expected a non-empty emoji string.',
    );
  }

  const cacheKey = buildCacheKey(normalizedEmoji, normalizedOptions);

  if (normalizedOptions.cache != null) {
    const cachedResult = getMemoryCache(cacheKey);
    if (cachedResult != null) {
      return toResult(cachedResult, 'memory-cache');
    }
  }

  if (normalizedOptions.cache === 'disk') {
    try {
      const diskResult = await EmojiMainColorModule.getCachedResult(cacheKey);
      if (diskResult != null) {
        const sanitized = sanitizePayload(diskResult, normalizedOptions);
        setMemoryCache(cacheKey, sanitized);
        return toResult(sanitized, 'disk-cache');
      }
    } catch {
      // Disk cache misses and read failures should not block computation.
    }
  }

  const existingRequest = getInFlightRequest(cacheKey);
  if (existingRequest != null) {
    try {
      const payload = await existingRequest;
      return toResult(payload, FALLBACK_SOURCE);
    } catch (error) {
      return buildFallbackOrThrow(
        normalizedEmoji,
        normalizedOptions,
        'Failed to compute emoji color.',
        error,
      );
    }
  }

  const inFlightRequest = computeAndCache(
    normalizedEmoji,
    cacheKey,
    normalizedOptions,
  );
  setInFlightRequest(cacheKey, inFlightRequest);

  try {
    const payload = await inFlightRequest;
    return toResult(payload, FALLBACK_SOURCE);
  } catch (error) {
    return buildFallbackOrThrow(
      normalizedEmoji,
      normalizedOptions,
      'Failed to compute emoji color.',
      error,
    );
  } finally {
    deleteInFlightRequest(cacheKey);
  }
}

export function getEmojiColors(
  emojis: string[],
  options?: GetEmojiColorOptions,
): Promise<EmojiColorResult[]> {
  return Promise.all(emojis.map(emoji => getEmojiColor(emoji, options)));
}

function normalizeOptions(
  options: GetEmojiColorOptions | undefined,
): NormalizedOptions {
  const cache =
    options?.cache === 'memory' || options?.cache === 'disk'
      ? options.cache
      : undefined;

  const paletteSize = clampInteger(
    options?.paletteSize,
    DEFAULT_PALETTE_SIZE,
    0,
    MAX_PALETTE_SIZE,
  );
  const renderSize = clampInteger(
    options?.renderSize,
    DEFAULT_RENDER_SIZE,
    MIN_RENDER_SIZE,
    MAX_RENDER_SIZE,
  );

  return {
    cache,
    paletteSize,
    renderSize,
    fallbackColor: normalizeHexColor(options?.fallbackColor),
  };
}

function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value == null || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeHexColor(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }

  const match = value.trim().match(HEX_COLOR_PATTERN);
  if (match == null) {
    throw new EmojiColorError(
      "fallbackColor must be a 6-digit hex string like '#F4D83D'.",
    );
  }

  return `#${match[1].toUpperCase()}`;
}

function normalizeEmoji(emoji: string): string {
  return emoji.trim();
}

function isLikelyEmoji(value: string): boolean {
  if (value.length === 0) {
    return false;
  }

  try {
    return /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u200d|\ufe0f|\u20e3)/u.test(
      value,
    );
  } catch {
    return true;
  }
}

function buildCacheKey(emoji: string, options: NormalizedOptions): string {
  return JSON.stringify({
    emoji,
    algorithmVersion: ALGORITHM_VERSION,
    paletteSize: options.paletteSize,
    renderSize: options.renderSize,
  });
}

async function computeAndCache(
  emoji: string,
  cacheKey: string,
  options: NormalizedOptions,
): Promise<NativeEmojiColorPayload> {
  const computeOptions: NativeComputeOptions = {
    emoji,
    paletteSize: options.paletteSize,
    renderSize: options.renderSize,
  };

  const computedPayload = sanitizePayload(
    await EmojiMainColorModule.compute(computeOptions),
    options,
  );

  if (options.cache != null) {
    setMemoryCache(cacheKey, computedPayload);
  }

  if (options.cache === 'disk') {
    try {
      await EmojiMainColorModule.setCachedResult(cacheKey, computedPayload);
    } catch {
      // A disk cache write failure should not turn a successful computation
      // into a rejected API call.
    }
  }

  return computedPayload;
}

function sanitizePayload(
  payload: NativeEmojiColorPayload,
  options: NormalizedOptions,
): NativeEmojiColorPayload {
  const mainColor = normalizeHexColor(payload.mainColor);
  if (mainColor == null) {
    throw new EmojiColorError('Native module returned an empty mainColor.');
  }

  const rawPalette = Array.isArray(payload.palette)
    ? payload.palette
    : mainColor != null
      ? [mainColor]
      : [];

  const palette =
    options.paletteSize > 0
      ? dedupeColors([mainColor, ...rawPalette])
          .map(color => normalizeHexColor(color))
          .filter((color): color is string => color != null)
          .slice(0, options.paletteSize)
      : undefined;
  const colorCandidates = dedupeColors([
    mainColor,
    ...(Array.isArray(payload.palette) ? payload.palette : []),
  ])
    .map(color => normalizeHexColor(color))
    .filter((color): color is string => color != null);
  const mainDarkColor =
    normalizeHexColor(payload.mainDarkColor) ??
    pickDarkColor(mainColor, colorCandidates);
  const mainLightColor =
    normalizeHexColor(payload.mainLightColor) ??
    pickLightColor(mainColor, colorCandidates);

  return {
    emoji: payload.emoji,
    mainColor,
    mainDarkColor,
    mainLightColor,
    palette,
  };
}

function dedupeColors(colors: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const color of colors) {
    const normalized = color.toUpperCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      deduped.push(normalized);
    }
  }

  return deduped;
}

function pickDarkColor(mainColor: string, colors: string[]): string {
  const mainBrightness = colorBrightness(mainColor);
  const darkerColors = colors.filter(
    color => colorBrightness(color) < mainBrightness,
  );

  return (
    darkerColors.sort(
      (left, right) => colorBrightness(left) - colorBrightness(right),
    )[0] ?? mainColor
  );
}

function pickLightColor(mainColor: string, colors: string[]): string {
  const mainBrightness = colorBrightness(mainColor);
  const lighterColors = colors.filter(
    color => colorBrightness(color) > mainBrightness,
  );

  return (
    lighterColors.sort(
      (left, right) => colorBrightness(right) - colorBrightness(left),
    )[0] ?? mainColor
  );
}

function colorBrightness(color: string): number {
  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);

  return (red * 299 + green * 587 + blue * 114) / 1000;
}

function toResult(
  payload: NativeEmojiColorPayload,
  source: EmojiColorResult['source'],
): EmojiColorResult {
  return {
    emoji: payload.emoji,
    mainColor: payload.mainColor,
    mainDarkColor: payload.mainDarkColor ?? payload.mainColor,
    mainLightColor: payload.mainLightColor ?? payload.mainColor,
    palette: payload.palette,
    source,
  };
}

function buildFallbackOrThrow(
  emoji: string,
  options: NormalizedOptions,
  message: string,
  cause?: unknown,
): never | EmojiColorResult {
  if (options.fallbackColor != null) {
    return {
      emoji,
      mainColor: options.fallbackColor,
      mainDarkColor: options.fallbackColor,
      mainLightColor: options.fallbackColor,
      palette:
        options.paletteSize > 0
          ? Array(options.paletteSize).fill(options.fallbackColor)
          : undefined,
      source: FALLBACK_SOURCE,
    };
  }

  throw new EmojiColorError(message, cause);
}
