export type CacheMode = 'memory' | 'disk';

export type GetEmojiColorOptions = {
  cache?: CacheMode;
  paletteSize?: number;
  renderSize?: number;
  fallbackColor?: string;
};

export type EmojiColorResult = {
  emoji: string;
  mainColor: string;
  palette?: string[];
  source: 'computed' | 'memory-cache' | 'disk-cache';
};

export type InternalOptions = Required<Pick<GetEmojiColorOptions, 'paletteSize' | 'renderSize'>> &
  Pick<GetEmojiColorOptions, 'fallbackColor' | 'cache'>;

export type PixelData = {
  width: number;
  height: number;
  rgba: number[];
};
