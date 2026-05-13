'use client';

import LocalizedLink from '@/components/LocalizedLink';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import CtaExperimentExposure from '@/components/analytics/CtaExperimentExposure';
import { trackCtaExperimentClick } from '@/lib/analytics/events';

type Variant = {
  id: string;
  label: string;
  className: string;
  href: string;
  style?: CSSProperties;
};

export default function ExperimentedCtaLink({
  experiment,
  variants,
}: {
  experiment: string;
  variants: readonly Variant[];
}) {
  const pathname = usePathname() ?? '';
  const defaultVariant = variants[0];
  const [activeVariantId, setActiveVariantId] = useState(defaultVariant.id);
  const stableVariants = useMemo(() => variants, [variants]);
  const variantIds = useMemo(() => stableVariants.map((v) => v.id), [stableVariants]);
  const selected = stableVariants.find((v) => v.id === activeVariantId) ?? defaultVariant;

  return (
    <>
      <CtaExperimentExposure
        experiment={experiment}
        variants={variantIds}
        onVariant={setActiveVariantId}
      />
      <LocalizedLink
        href={selected.href}
        className={selected.className}
        style={selected.style}
        onClick={() => trackCtaExperimentClick(experiment, selected.id, pathname, selected.href)}
      >
        {selected.label}
      </LocalizedLink>
    </>
  );
}
