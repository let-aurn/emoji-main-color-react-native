import { useEffect, useMemo, useState } from 'react';
import { getEmojiColor } from './core';
import { EmojiColorResult, GetEmojiColorOptions } from './types';

type HookState = {
  loading: boolean;
  error: Error | null;
  result: EmojiColorResult | null;
};

export const useEmojiColor = (emoji: string, options?: GetEmojiColorOptions): HookState => {
  const [state, setState] = useState<HookState>({ loading: true, error: null, result: null });
  const stableOptions = useMemo(() => options, [JSON.stringify(options)]);

  useEffect(() => {
    let mounted = true;
    setState({ loading: true, error: null, result: null });

    getEmojiColor(emoji, stableOptions)
      .then((result) => {
        if (mounted) {
          setState({ loading: false, error: null, result });
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setState({ loading: false, error, result: null });
        }
      });

    return () => {
      mounted = false;
    };
  }, [emoji, stableOptions]);

  return state;
};
