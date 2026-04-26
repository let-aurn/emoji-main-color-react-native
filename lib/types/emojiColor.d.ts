import type { EmojiColorResult, GetEmojiColorOptions } from './types';
export declare class EmojiColorError extends Error {
    constructor(message: string, cause?: unknown);
    cause?: unknown;
}
export declare function getEmojiColor(emoji: string, options?: GetEmojiColorOptions): Promise<EmojiColorResult>;
export declare function getEmojiColors(emojis: string[], options?: GetEmojiColorOptions): Promise<EmojiColorResult[]>;
//# sourceMappingURL=emojiColor.d.ts.map