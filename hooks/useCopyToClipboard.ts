'use client';

import { useCallback, useRef, useState } from 'react';

/** Returns copy() and copied (true for ~2s after success). */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (t.current) clearTimeout(t.current);
      setCopied(true);
      t.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  return { copy, copied };
}
