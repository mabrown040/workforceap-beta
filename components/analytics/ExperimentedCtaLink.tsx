'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import CtaExperimentExposure from '@/components/analytics/CtaExperimentExposure';
import { trackCtaExperimentClick } from '@/lib/analytics/events';

type Variant = {
  id: string;
  label: string;
  className: string;
  href: string;
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
      <Link
        href={selected.href}
        className={selected.className}
        onClick={() => trackCtaExperimentClick(experiment, selected.id, pathname, selected.href)}
      >
        {selected.label}
      </Link>
    </>
  );
}
