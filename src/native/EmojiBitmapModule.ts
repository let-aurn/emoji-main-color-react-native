import { NativeModules, Platform } from 'react-native';
import { PixelData } from '../types';

export interface EmojiNativeModule {
  renderEmojiToPixels(emoji: string, renderSize: number): Promise<PixelData>;
  getDiskCache(key: string): Promise<string | null>;
  setDiskCache(key: string, value: string): Promise<void>;
}

const LINKING_ERROR =
  `The package 'emoji-main-color-react-native' doesn't seem to be linked. ${
    Platform.OS === 'ios' ? "Run 'pod install' and rebuild." : 'Rebuild the app.'
  }`;

const EmojiMainColorModule = NativeModules.EmojiMainColorModule as EmojiNativeModule | undefined;

export const getNativeModule = (): EmojiNativeModule => {
  if (!EmojiMainColorModule) {
    throw new Error(LINKING_ERROR);
  }
  return EmojiMainColorModule;
};
