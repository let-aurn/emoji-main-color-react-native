import {NativeModules, Platform} from 'react-native';

import type {NativeComputeOptions, NativeEmojiColorPayload} from './types';

type EmojiMainColorNativeModule = {
  compute(options: NativeComputeOptions): Promise<NativeEmojiColorPayload>;
  getCachedResult(key: string): Promise<NativeEmojiColorPayload | null>;
  setCachedResult(
    key: string,
    value: NativeEmojiColorPayload,
  ): Promise<void>;
};

const LINKING_ERROR =
  `The package 'emoji-main-color-react-native' does not appear to be linked correctly.\n\n` +
  Platform.select({
    ios: "Run 'bundle exec pod install' inside the iOS app after installing the package.",
    android: 'Rebuild the Android app after installing the package.',
    default: 'Rebuild the app after installing the package.',
  });

const nativeModule = NativeModules.RNEmojiMainColorModule as
  | EmojiMainColorNativeModule
  | undefined;

const EmojiMainColorModule: EmojiMainColorNativeModule = nativeModule ?? {
  async compute(): Promise<NativeEmojiColorPayload> {
    throw new Error(LINKING_ERROR);
  },
  async getCachedResult(): Promise<NativeEmojiColorPayload | null> {
    throw new Error(LINKING_ERROR);
  },
  async setCachedResult(): Promise<void> {
    throw new Error(LINKING_ERROR);
  },
};

export default EmojiMainColorModule;
