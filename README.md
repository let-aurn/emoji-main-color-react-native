# emoji-main-color-react-native

A React Native library that renders an emoji into a native bitmap, extracts its dominant color, and can optionally return a small palette.

The package is built for real React Native apps:

- TypeScript-first public API
- small native bridge on iOS and Android
- memory and disk cache support
- concurrent request deduplication
- no external runtime dependencies

## Installation

```sh
npm install emoji-main-color-react-native
# or
yarn add emoji-main-color-react-native
```

### iOS

```sh
bundle install
cd ios && bundle exec pod install && cd ..
```

If your app uses static framework linkage for Swift pods, keep this in your `Podfile`:

```ruby
use_frameworks! :linkage => :static
```

### Android

No extra setup is required beyond React Native autolinking.

## Usage

### `getEmojiColor`

```ts
import {getEmojiColor} from 'emoji-main-color-react-native';

const result = await getEmojiColor('🍋', {
  cache: 'disk',
  paletteSize: 4,
  renderSize: 72,
});

console.log(result);
// {
//   emoji: '🍋',
//   mainColor: '#F4D83D',
//   palette: ['#F4D83D', '#A8C15A', '#6D8D3F', '#D89C36'],
//   source: 'computed' | 'memory-cache' | 'disk-cache'
// }
```

### `getEmojiColors`

```ts
import {getEmojiColors} from 'emoji-main-color-react-native';

const results = await getEmojiColors(['🍋', '🦊', '🌵'], {
  cache: 'memory',
  renderSize: 64,
});
```

### `useEmojiColor`

```tsx
import React from 'react';
import {Text, View} from 'react-native';
import {useEmojiColor} from 'emoji-main-color-react-native';

export function EmojiPreview() {
  const {result, loading, error, reload} = useEmojiColor('🦊', {
    cache: 'disk',
    paletteSize: 3,
  });

  if (loading) {
    return <Text>Loading…</Text>;
  }

  if (error != null) {
    return <Text onPress={reload}>{error.message}</Text>;
  }

  return (
    <View>
      <Text>{result?.emoji}</Text>
      <Text>{result?.mainColor}</Text>
    </View>
  );
}
```

## API

### Functions

#### `getEmojiColor(emoji, options?)`

Returns a `Promise<EmojiColorResult>`.

#### `getEmojiColors(emojis, options?)`

Runs `getEmojiColor` for each entry and preserves order.

#### `useEmojiColor(emoji, options?)`

Returns:

```ts
type UseEmojiColorResult = {
  result: EmojiColorResult | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
};
```

### Types

```ts
type CacheMode = 'memory' | 'disk';

type GetEmojiColorOptions = {
  cache?: CacheMode;
  paletteSize?: number;
  renderSize?: number;
  fallbackColor?: string;
};

type EmojiColorResult = {
  emoji: string;
  mainColor: string;
  palette?: string[];
  source: 'computed' | 'memory-cache' | 'disk-cache';
};
```

## Cache behavior

- When `cache` is omitted, the library computes each request fresh.
- When `cache: 'memory'`, the library checks an in-memory JS cache before computing.
- When `cache: 'disk'`, the library checks memory first, then native disk cache, then computes and stores in both.
- Cache keys include the emoji, the algorithm version, `paletteSize`, and `renderSize`.
- In-flight work is deduplicated so repeated concurrent calls for the same emoji and options share one native computation.

## Invalid input and fallback behavior

- Empty or clearly invalid emoji input throws `EmojiColorError`.
- If `fallbackColor` is provided, invalid input or native extraction failures return that color instead of throwing.
- `fallbackColor` must be a 6-digit hex string like `#F4D83D`.

## How color extraction works

Each platform follows the same high-level pipeline:

1. Render the emoji to a transparent bitmap natively.
2. Sample pixels with transparency filtering.
3. Quantize colors into compact buckets for speed.
4. Downweight tiny highlights, very dark outlines, and near-white glare.
5. Merge similar buckets into broader clusters.
6. Return the top cluster as `mainColor` and the top `paletteSize` clusters as `palette`.

This is intentionally a practical dominant-color algorithm rather than a perfect pixel histogram. It favors stable, visually useful colors for UI work.

## Performance notes

- Default `renderSize` is `64`, which balances visual fidelity and speed well for most apps.
- Larger render sizes can improve palette quality for complex emoji sequences, but they cost more CPU.
- Memory cache is the best option for repeated lookups during one app session.
- Disk cache is useful when the same emoji set appears across launches.

## Platform notes

- Results can differ slightly between iOS and Android because each OS renders emoji using its own native font artwork.
- The algorithm is kept intentionally similar across platforms, but platform rendering still affects the final sampled pixels.
- Disk cache is stored in each platform’s cache directory, so the OS may clear it at any time.

## Example

See [example/App.tsx](/Users/david/Developer/emoji-main-color-react-native/example/App.tsx) for a demo screen.

## Development

```sh
npm install
npm run verify
```

## Testing

The test suite covers:

- memory cache behavior
- disk cache behavior
- result shape normalization
- invalid input handling
- hook behavior
- concurrent request deduplication

## Tradeoffs

- The native bridge is deliberately small and synchronous in scope: render, analyze, and cache.
- The extraction algorithm is heuristic rather than ML-based, which keeps the package dependency-free and fast.
- The hook returns a small state object instead of trying to hide loading and error states.
- Results are deterministic per platform, but not guaranteed to match across platforms because emoji glyphs differ.
