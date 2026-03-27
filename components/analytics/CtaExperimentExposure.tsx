'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { getExperimentVariant } from '@/lib/analytics/ctaExperiment';
import { trackCtaExperimentExposure } from '@/lib/analytics/events';

type Props = {
  experiment: string;
  variants: readonly string[];
  onVariant: (variant: string) => void;
};

export default function CtaExperimentExposure({ experiment, variants, onVariant }: Props) {
  const pathname = usePathname() ?? '';
  const variant = useMemo(() => getExperimentVariant(experiment, variants, 'visitor'), [experiment, variants]);

  useEffect(() => {
    onVariant(variant);
    const dedupeKey = `wa_exp_seen:${experiment}:${variant}:${pathname}`;
    let alreadyTracked = false;
    try {
      alreadyTracked = sessionStorage.getItem(dedupeKey) === '1';
      if (!alreadyTracked) sessionStorage.setItem(dedupeKey, '1');
    } catch {
      alreadyTracked = false;
    }
    if (!alreadyTracked) {
      trackCtaExperimentExposure(experiment, variant, pathname);
    }
  }, [experiment, onVariant, pathname, variant]);

  return null;
}
