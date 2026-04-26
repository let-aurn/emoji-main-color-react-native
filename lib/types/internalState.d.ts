import type { NativeEmojiColorPayload } from './types';
export declare function getMemoryCache(key: string): NativeEmojiColorPayload | undefined;
export declare function setMemoryCache(key: string, value: NativeEmojiColorPayload): void;
export declare function getInFlightRequest(key: string): Promise<NativeEmojiColorPayload> | undefined;
export declare function setInFlightRequest(key: string, value: Promise<NativeEmojiColorPayload>): void;
export declare function deleteInFlightRequest(key: string): void;
export declare function clearEmojiColorCaches(): void;
//# sourceMappingURL=internalState.d.ts.map