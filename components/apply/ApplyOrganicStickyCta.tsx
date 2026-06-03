'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useApplyStickyCtaVisibility } from '@/lib/apply/useApplyStickyCtaVisibility';
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';

const FORM_START_ID = 'apply-form-start';

export default function ApplyOrganicStickyCta() {
  const t = useTranslations('apply');
  const visible = useApplyStickyCtaVisibility(`#${FORM_START_ID}`);

  const scrollToForm = useCallback(() => {
    document.getElementById(FORM_START_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (!visible) return null;

  return (
    <div className="apply-organic-sticky-cta" role="region" aria-label={t('startYourApplication')}>
      <button
        type="button"
        className={marketingButtonPresets.heroPrimary('apply-organic-sticky-cta__button')}
        onClick={scrollToForm}
      >
        {t('startYourApplication')}
      </button>
    </div>
  );
}
