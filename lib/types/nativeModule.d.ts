import type { NativeComputeOptions, NativeEmojiColorPayload } from './types';
type EmojiMainColorNativeModule = {
    compute(options: NativeComputeOptions): Promise<NativeEmojiColorPayload>;
    getCachedResult(key: string): Promise<NativeEmojiColorPayload | null>;
    setCachedResult(key: string, value: NativeEmojiColorPayload): Promise<void>;
};
declare const EmojiMainColorModule: EmojiMainColorNativeModule;
export default EmojiMainColorModule;
//# sourceMappingURL=nativeModule.d.ts.map