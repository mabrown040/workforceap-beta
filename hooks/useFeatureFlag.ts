'use client';

import { useState, useEffect, useCallback } from 'react';

interface FeatureFlagPublic {
  key: string;
  name: string;
  description: string | null;
}

let cachedFlags: FeatureFlagPublic[] | null = null;
let fetchPromise: Promise<FeatureFlagPublic[]> | null = null;

async function loadFlags(): Promise<FeatureFlagPublic[]> {
  if (cachedFlags) return cachedFlags;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/feature-flags')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load feature flags');
      return res.json();
    })
    .then((data) => {
      cachedFlags = data.flags ?? [];
      return cachedFlags!;
    })
    .catch((err) => {
      console.error('[useFeatureFlag] failed to load flags:', err);
      cachedFlags = [];
      return cachedFlags!;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlagPublic[]>(cachedFlags ?? []);
  const [loading, setLoading] = useState(cachedFlags === null);

  useEffect(() => {
    let cancelled = false;
    if (cachedFlags === null) {
      setLoading(true);
      loadFlags().then((f) => {
        if (!cancelled) {
          setFlags(f);
          setLoading(false);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const isEnabled = useCallback(
    (key: string): boolean => {
      return flags.some((f) => f.key === key);
    },
    [flags]
  );

  return { flags, loading, isEnabled };
}

export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}
