# emoji-main-color-react-native

A production-ready React Native library that extracts a dominant color (and optional palette) from emoji glyph rendering.

## Design and Package Structure

```txt
emoji-main-color-react-native/
  src/
    index.ts                # public exports
    types.ts                # public + internal types
    core.ts                 # API implementation, cache orchestration, dedupe
    hook.ts                 # useEmojiColor hook
    cache.ts                # memory cache + key strategy
    colorExtraction.ts      # sampling + k-means + ranking
    native/EmojiBitmapModule.ts
    __tests__/core.test.ts
  ios/
    EmojiMainColorModule.h
    EmojiMainColorModule.m  # emoji rendering + NSUserDefaults disk cache
  android/src/main/java/com/emojimaincolorreactnative/
    EmojiMainColorModule.java
    EmojiMainColorPackage.java
  example/
    EmojiColorDemo.tsx
```

## Installation

```bash
npm install emoji-main-color-react-native
```

Then install iOS pods:

```bash
cd ios && pod install
```

### Android registration

For React Native versions without autolinking, register `EmojiMainColorPackage` in your `MainApplication` package list.

## Public API

```ts
getEmojiColor(emoji: string, options?: GetEmojiColorOptions): Promise<EmojiColorResult>
getEmojiColors(emojis: string[], options?: GetEmojiColorOptions): Promise<EmojiColorResult[]>
useEmojiColor(emoji: string, options?: GetEmojiColorOptions)
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

## Usage

### Single emoji

```ts
import { getEmojiColor } from 'emoji-main-color-react-native';

const result = await getEmojiColor('🍋', {
  cache: 'disk',
  paletteSize: 3,
  renderSize: 64,
  fallbackColor: '#808080',
});
```

### Batch usage

```ts
import { getEmojiColors } from 'emoji-main-color-react-native';

const colors = await getEmojiColors(['🍋', '🦊', '🌊'], { cache: 'memory' });
```

### Hook usage

```tsx
import { useEmojiColor } from 'emoji-main-color-react-native';

const { loading, error, result } = useEmojiColor('🦊', { cache: 'disk', paletteSize: 4 });
```

## Behavior and Caching Semantics

- No `cache` option: always compute.
- `cache: 'memory'`: memory cache lookup first, compute on miss, store in memory.
- `cache: 'disk'`: memory cache lookup -> disk cache lookup -> compute on miss -> store in memory and disk.
- Cache keys include algorithm version + emoji + render size + palette size.
- Duplicate in-flight requests for the same key are deduplicated.

## Color Extraction Approach

1. Native layer renders the emoji onto a transparent bitmap.
2. JS extraction downsamples pixels for speed.
3. Transparent, near-black, and near-white pixels are filtered out.
4. K-means quantization groups colors.
5. Cluster ranking weights both population and saturation to avoid tiny highlights dominating results.
6. Returns uppercase hex (`#RRGGBB`) for `mainColor`, and optional palette.

## Performance Notes

- Keep `renderSize` near 48–72 for most UI use-cases.
- `paletteSize` above 5 increases compute cost with marginal benefit.
- Use `cache: 'disk'` in production for repeated emoji usage across sessions.
- In-flight dedupe prevents duplicate native render/compute work under parallel calls.

## Error Handling

- Invalid emoji input throws by default.
- If `fallbackColor` is supplied, failures return fallback result instead of throwing.

## Testing

Run:

```bash
npm test
npm run typecheck
```

Covered scenarios:

- cache behavior (memory/disk)
- invalid input with fallback
- result shape validation
- batch API behavior

## Tradeoffs and Platform Notes

- Native rendering is required for accurate glyph pixels from platform emoji fonts.
- Exact resulting colors can vary slightly across iOS/Android because glyph assets differ by platform and OS version.
- Disk cache uses lightweight platform stores (`NSUserDefaults` and `SharedPreferences`) for minimal dependencies.
- Pixel transfer currently crosses bridge as integer arrays; this is simple and robust but could be optimized later with JSI/TurboModules if needed for extreme throughput.

## Example Component

See [`example/EmojiColorDemo.tsx`](./example/EmojiColorDemo.tsx) for ready-to-drop usage.
