export type CacheMode = 'memory' | 'disk';

export type GetEmojiColorOptions = {
  cache?: CacheMode;
  paletteSize?: number;
  renderSize?: number;
  fallbackColor?: string;
};

export type EmojiColorSource = 'computed' | 'memory-cache' | 'disk-cache';

export type EmojiColorResult = {
  emoji: string;
  mainColor: string;
  mainDarkColor: string;
  mainLightColor: string;
  palette?: string[];
  source: EmojiColorSource;
};

export type UseEmojiColorResult = {
  result: EmojiColorResult | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
};

export type NativeEmojiColorPayload = {
  emoji: string;
  mainColor: string;
  mainDarkColor?: string;
  mainLightColor?: string;
  palette?: string[];
};

export type NativeComputeOptions = {
  emoji: string;
  paletteSize: number;
  renderSize: number;
};
