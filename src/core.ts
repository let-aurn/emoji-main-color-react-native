import { extractMainColorAndPalette } from './colorExtraction';
import { getCacheKey, memoryCacheGet, memoryCacheSet } from './cache';
import { getNativeModule } from './native/EmojiBitmapModule';
import { EmojiColorResult, GetEmojiColorOptions, InternalOptions } from './types';

const inFlight = new Map<string, Promise<EmojiColorResult>>();

const normalizeOptions = (options?: GetEmojiColorOptions): InternalOptions => ({
  cache: options?.cache,
  paletteSize: Math.max(1, Math.min(options?.paletteSize ?? 1, 8)),
  renderSize: Math.max(24, Math.min(options?.renderSize ?? 72, 256)),
  fallbackColor: options?.fallbackColor,
});

const assertEmoji = (emoji: string): void => {
  if (!emoji || typeof emoji !== 'string' || !emoji.trim()) {
    throw new Error('emoji must be a non-empty string.');
  }
};

const withFallback = (emoji: string, fallbackColor: string): EmojiColorResult => ({
  emoji,
  mainColor: fallbackColor,
  palette: undefined,
  source: 'computed',
});

export const getEmojiColor = async (
  emoji: string,
  options?: GetEmojiColorOptions,
): Promise<EmojiColorResult> => {
  const normalized = normalizeOptions(options);
  const key = getCacheKey(emoji, normalized.renderSize, normalized.paletteSize);

  try {
    assertEmoji(emoji);
    const memoryHit = memoryCacheGet(key);
    if (memoryHit && normalized.cache) {
      return { ...memoryHit, source: 'memory-cache' };
    }

    if (normalized.cache === 'disk') {
      const diskPayload = await getNativeModule().getDiskCache(key);
      if (diskPayload) {
        const parsed = JSON.parse(diskPayload) as EmojiColorResult;
        memoryCacheSet(key, parsed);
        return { ...parsed, source: 'disk-cache' };
      }
    }

    if (inFlight.has(key)) {
      return inFlight.get(key)!;
    }

    const promise = (async (): Promise<EmojiColorResult> => {
      const pixelData = await getNativeModule().renderEmojiToPixels(emoji, normalized.renderSize);
      const extracted = extractMainColorAndPalette(pixelData, normalized.paletteSize);
      const result: EmojiColorResult = {
        emoji,
        mainColor: extracted.mainColor,
        palette: extracted.palette,
        source: 'computed',
      };

      if (normalized.cache === 'memory' || normalized.cache === 'disk') {
        memoryCacheSet(key, result);
      }

      if (normalized.cache === 'disk') {
        await getNativeModule().setDiskCache(key, JSON.stringify(result));
      }

      return result;
    })();

    inFlight.set(key, promise);
    const result = await promise;
    inFlight.delete(key);
    return result;
  } catch (error) {
    inFlight.delete(key);
    if (normalized.fallbackColor) {
      return withFallback(emoji, normalized.fallbackColor);
    }
    throw error;
  }
};

export const getEmojiColors = async (
  emojis: string[],
  options?: GetEmojiColorOptions,
): Promise<EmojiColorResult[]> => Promise.all(emojis.map((emoji) => getEmojiColor(emoji, options)));
