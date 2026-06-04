'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useApplyStickyCtaVisibility } from '@/lib/apply/useApplyStickyCtaVisibility';
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';

const FORM_START_ID = 'apply-form-start';
/** Keep sticky hidden while any part of the form card is visible (intro, fields, docs checklist). */
const STICKY_HIDE_SELECTOR = '.apply-main-form';

export default function ApplyOrganicStickyCta() {
  const t = useTranslations('apply');
  const visible = useApplyStickyCtaVisibility(STICKY_HIDE_SELECTOR);

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
