'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';

const SCROLL_SHOW_THRESHOLD = 320;
const FORM_START_ID = 'apply-form-start';

export default function ApplyOrganicStickyCta() {
  const t = useTranslations('apply');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onScroll = () => {
      setVisible(mq.matches && window.scrollY > SCROLL_SHOW_THRESHOLD);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    mq.addEventListener('change', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      mq.removeEventListener('change', onScroll);
    };
  }, []);

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
