import { EmojiColorResult } from './types';

const CACHE_VERSION = 'v1';
const memoryCache = new Map<string, EmojiColorResult>();

export const getCacheKey = (
  emoji: string,
  renderSize: number,
  paletteSize: number,
): string => `${CACHE_VERSION}:${emoji}:${renderSize}:${paletteSize}`;

export const memoryCacheGet = (key: string): EmojiColorResult | undefined => memoryCache.get(key);

export const memoryCacheSet = (key: string, value: EmojiColorResult): void => {
  memoryCache.set(key, value);
};

export const clearMemoryCache = (): void => {
  memoryCache.clear();
};
