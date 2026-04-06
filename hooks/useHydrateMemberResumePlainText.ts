'use client';

import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { stripMarkdownForPreview } from '@/lib/text/stripMarkdown';

/**
 * On mount, loads plain text from the member's uploaded resume (if any) and
 * pre-fills the textarea only when it is still empty — same behavior as Resume Coach hydration.
 */
export function useHydrateMemberResumePlainText(setText: Dispatch<SetStateAction<string>>) {
  useEffect(() => {
    let cancelled = false;
    fetch('/api/member/resume?includePlainText=1')
      .then((r) => r.json())
      .then((d: { resumePlainText?: string | null }) => {
        if (cancelled) return;
        const t = d.resumePlainText?.trim();
        if (t) {
          const plain = stripMarkdownForPreview(t, 12000);
          setText((prev) => (prev.trim() ? prev : plain));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setText]);
}
