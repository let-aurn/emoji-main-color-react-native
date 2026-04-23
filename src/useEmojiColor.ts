import {useEffect, useReducer, useState} from 'react';

import {getEmojiColor} from './emojiColor';
import type {
  EmojiColorResult,
  GetEmojiColorOptions,
  UseEmojiColorResult,
} from './types';

type UseEmojiColorState = {
  result: EmojiColorResult | null;
  loading: boolean;
  error: Error | null;
};

export function useEmojiColor(
  emoji: string,
  options?: GetEmojiColorOptions,
): UseEmojiColorResult {
  const [reloadCount, triggerReload] = useReducer((value: number) => value + 1, 0);
  const [state, setState] = useState<UseEmojiColorState>({
    result: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    let isActive = true;

    setState(previousState => ({
      result: previousState.result,
      loading: true,
      error: null,
    }));

    getEmojiColor(emoji, options)
      .then(result => {
        if (!isActive) {
          return;
        }

        setState({
          result,
          loading: false,
          error: null,
        });
      })
      .catch(error => {
        if (!isActive) {
          return;
        }

        setState({
          result: null,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      isActive = false;
    };
  }, [
    emoji,
    options?.cache,
    options?.fallbackColor,
    options?.paletteSize,
    options?.renderSize,
    reloadCount,
  ]);

  return {
    result: state.result,
    loading: state.loading,
    error: state.error,
    reload: () => {
      triggerReload();
    },
  };
}
