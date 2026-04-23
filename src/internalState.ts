import type {NativeEmojiColorPayload} from './types';

const memoryCache = new Map<string, NativeEmojiColorPayload>();
const inFlightRequests = new Map<string, Promise<NativeEmojiColorPayload>>();

export function getMemoryCache(key: string): NativeEmojiColorPayload | undefined {
  return memoryCache.get(key);
}

export function setMemoryCache(key: string, value: NativeEmojiColorPayload): void {
  memoryCache.set(key, value);
}

export function getInFlightRequest(
  key: string,
): Promise<NativeEmojiColorPayload> | undefined {
  return inFlightRequests.get(key);
}

export function setInFlightRequest(
  key: string,
  value: Promise<NativeEmojiColorPayload>,
): void {
  inFlightRequests.set(key, value);
}

export function deleteInFlightRequest(key: string): void {
  inFlightRequests.delete(key);
}

export function clearEmojiColorCaches(): void {
  memoryCache.clear();
  inFlightRequests.clear();
}
