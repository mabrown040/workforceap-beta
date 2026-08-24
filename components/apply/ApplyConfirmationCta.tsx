'use client';

import { useMemo } from 'react';
import LocalizedLink from '@/components/LocalizedLink';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function ApplyConfirmationCta() {
  const t = useTranslations('apply');
  const searchParams = useSearchParams();
  const email = useMemo(() => {
    const raw = searchParams?.get('email')?.trim() ?? '';
    return raw;
  }, [searchParams]);

  const createHref = email ? `/apply/create-account?email=${encodeURIComponent(email)}` : '/apply/create-account';

  return (
    <div
      className="apply-confirmation-account-cta"
      style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 8%, transparent), color-mix(in srgb, var(--color-accent) 2%, transparent))',
        border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
        borderRadius: '8px',
        padding: '1.35rem',
        marginBottom: '1.5rem',
      }}
    >
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
        {t('confirmationRecommendedEyebrow')}
      </p>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem' }}>{t('confirmationGuestPromoTitle')}</h2>
      <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface)', fontSize: '0.95rem', lineHeight: 1.5 }}>
        {t('confirmationGuestPromoBody')}
      </p>
      {email ? (
        <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
          <strong>{t('confirmationGuestEmailLabel')}</strong> {email}
        </p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <LocalizedLink href={createHref} className="btn btn-primary">
          {t('confirmationGuestCreateAccount')}
        </LocalizedLink>
        <LocalizedLink href="/apply/status" className="btn btn-outline">
          {t('confirmationCheckStatusShort')}
        </LocalizedLink>
      </div>
      <p style={{ margin: '1rem 0 0', fontSize: '0.88rem', color: 'var(--color-on-surface-variant)' }}>
        {t('confirmationGuestLaterNote')}
      </p>
    </div>
  );
}
