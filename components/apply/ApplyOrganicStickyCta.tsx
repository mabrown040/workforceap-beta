'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useApplyStickyCtaVisibility } from '@/lib/apply/useApplyStickyCtaVisibility';
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';
import { scrollBehavior } from '@/lib/a11y/scrollBehavior';

const FORM_START_ID = 'apply-form-start';
/** Keep sticky hidden while the post-hero apply corridor is visible (form, sidebar, help, supp cards, footer). */
const STICKY_HIDE_SELECTOR = '.apply-grid-layout, .apply-supp-row, .apply-page-organic footer';

export default function ApplyOrganicStickyCta() {
  const t = useTranslations('apply');
  const visible = useApplyStickyCtaVisibility(STICKY_HIDE_SELECTOR);

  const scrollToForm = useCallback(() => {
    document.getElementById(FORM_START_ID)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
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
