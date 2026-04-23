import { getEmojiColor, getEmojiColors } from '../core';
import { clearMemoryCache } from '../cache';

const nativeMock = {
  renderEmojiToPixels: jest.fn(async () => ({
    width: 4,
    height: 4,
    rgba: [
      250, 230, 50, 255,
      248, 228, 40, 255,
      250, 230, 50, 255,
      248, 228, 40, 255,
      250, 230, 50, 255,
      248, 228, 40, 255,
      250, 230, 50, 255,
      248, 228, 40, 255,
      250, 230, 50, 255,
      248, 228, 40, 255,
      250, 230, 50, 255,
      248, 228, 40, 255,
      250, 230, 50, 255,
      248, 228, 40, 255,
      250, 230, 50, 255,
      248, 228, 40, 255,
    ],
  })),
  getDiskCache: jest.fn(async () => null),
  setDiskCache: jest.fn(async () => undefined),
};

jest.mock('../native/EmojiBitmapModule', () => ({
  getNativeModule: () => nativeMock,
}));

describe('getEmojiColor', () => {
  beforeEach(() => {
    clearMemoryCache();
    jest.clearAllMocks();
  });

  it('returns computed shape', async () => {
    const result = await getEmojiColor('🍋', { paletteSize: 3 });
    expect(result.emoji).toBe('🍋');
    expect(result.mainColor).toMatch(/^#[0-9A-F]{6}$/);
    expect(result.palette).toHaveLength(2);
    expect(result.source).toBe('computed');
  });

  it('uses memory cache when enabled', async () => {
    const first = await getEmojiColor('🦊', { cache: 'memory' });
    const second = await getEmojiColor('🦊', { cache: 'memory' });

    expect(first.source).toBe('computed');
    expect(second.source).toBe('memory-cache');
    expect(nativeMock.renderEmojiToPixels).toHaveBeenCalledTimes(1);
  });

  it('uses disk cache when available', async () => {
    nativeMock.getDiskCache.mockResolvedValueOnce(
      JSON.stringify({ emoji: '😀', mainColor: '#FFCC00', source: 'computed' }),
    );

    const result = await getEmojiColor('😀', { cache: 'disk' });

    expect(result.source).toBe('disk-cache');
    expect(result.mainColor).toBe('#FFCC00');
    expect(nativeMock.renderEmojiToPixels).toHaveBeenCalledTimes(0);
  });

  it('returns fallback color for invalid input', async () => {
    const result = await getEmojiColor('', { fallbackColor: '#000000' });
    expect(result.mainColor).toBe('#000000');
  });

  it('supports batch requests', async () => {
    const results = await getEmojiColors(['🍋', '🦊'], { cache: 'memory', paletteSize: 1 });
    expect(results).toHaveLength(2);
    expect(results[0].emoji).toBe('🍋');
    expect(results[1].emoji).toBe('🦊');
  });
});
