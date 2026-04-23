const computeMock = jest.fn();
const getCachedResultMock = jest.fn();
const setCachedResultMock = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    RNEmojiMainColorModule: {
      compute: (...args: unknown[]) => computeMock(...args),
      getCachedResult: (...args: unknown[]) => getCachedResultMock(...args),
      setCachedResult: (...args: unknown[]) => setCachedResultMock(...args),
    },
  },
  Platform: {
    select: (value: Record<string, string>) => value.default ?? value.ios ?? value.android,
  },
}));

import {EmojiColorError, getEmojiColor} from '../src';
import {clearEmojiColorCaches} from '../src/internalState';

describe('emoji-main-color-react-native', () => {
  beforeEach(() => {
    computeMock.mockReset();
    getCachedResultMock.mockReset();
    setCachedResultMock.mockReset();
    clearEmojiColorCaches();
  });

  it('returns the computed result shape', async () => {
    computeMock.mockResolvedValue({
      emoji: '🍋',
      mainColor: '#f4d83d',
      palette: ['#f4d83d', '#90b95b'],
    });
    getCachedResultMock.mockResolvedValue(null);

    const result = await getEmojiColor('🍋', {paletteSize: 2, renderSize: 72});

    expect(result).toEqual({
      emoji: '🍋',
      mainColor: '#F4D83D',
      palette: ['#F4D83D', '#90B95B'],
      source: 'computed',
    });
    expect(computeMock).toHaveBeenCalledWith({
      emoji: '🍋',
      paletteSize: 2,
      renderSize: 72,
    });
  });

  it('uses memory cache when enabled', async () => {
    computeMock.mockResolvedValue({
      emoji: '🦊',
      mainColor: '#D97729',
      palette: ['#D97729'],
    });

    const firstResult = await getEmojiColor('🦊', {cache: 'memory', paletteSize: 1});
    const secondResult = await getEmojiColor('🦊', {cache: 'memory', paletteSize: 1});

    expect(firstResult.source).toBe('computed');
    expect(secondResult.source).toBe('memory-cache');
    expect(computeMock).toHaveBeenCalledTimes(1);
  });

  it('reads disk cache before computing and hydrates memory cache', async () => {
    getCachedResultMock.mockResolvedValue({
      emoji: '🍋',
      mainColor: '#F4D83D',
      palette: ['#F4D83D', '#A1BF57'],
    });

    const diskResult = await getEmojiColor('🍋', {cache: 'disk', paletteSize: 2});
    const memoryResult = await getEmojiColor('🍋', {cache: 'disk', paletteSize: 2});

    expect(diskResult.source).toBe('disk-cache');
    expect(memoryResult.source).toBe('memory-cache');
    expect(computeMock).not.toHaveBeenCalled();
  });

  it('writes to disk after a disk-cache miss', async () => {
    getCachedResultMock.mockResolvedValue(null);
    setCachedResultMock.mockResolvedValue(undefined);
    computeMock.mockResolvedValue({
      emoji: '🍋',
      mainColor: '#F4D83D',
      palette: ['#F4D83D'],
    });

    await getEmojiColor('🍋', {cache: 'disk', paletteSize: 1});

    expect(setCachedResultMock).toHaveBeenCalledTimes(1);
    expect(setCachedResultMock.mock.calls[0][1]).toEqual({
      emoji: '🍋',
      mainColor: '#F4D83D',
      palette: ['#F4D83D'],
    });
  });

  it('deduplicates concurrent work for the same emoji and options', async () => {
    computeMock.mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(
            () =>
              resolve({
                emoji: '🍋',
                mainColor: '#F4D83D',
              }),
            0,
          );
        }),
    );

    const [firstResult, secondResult] = await Promise.all([
      getEmojiColor('🍋'),
      getEmojiColor('🍋'),
    ]);

    expect(firstResult.mainColor).toBe('#F4D83D');
    expect(secondResult.mainColor).toBe('#F4D83D');
    expect(computeMock).toHaveBeenCalledTimes(1);
  });

  it('returns fallbackColor for invalid input when provided', async () => {
    const result = await getEmojiColor('', {
      fallbackColor: '#123456',
      paletteSize: 2,
    });

    expect(result).toEqual({
      emoji: '',
      mainColor: '#123456',
      palette: ['#123456', '#123456'],
      source: 'computed',
    });
    expect(computeMock).not.toHaveBeenCalled();
  });

  it('throws a clear error for invalid input without a fallback', async () => {
    await expect(getEmojiColor('')).rejects.toBeInstanceOf(EmojiColorError);
    await expect(getEmojiColor('')).rejects.toThrow(
      'Expected a non-empty emoji string.',
    );
  });
});
