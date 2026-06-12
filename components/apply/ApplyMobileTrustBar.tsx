import { getTranslations } from 'next-intl/server';

/** Compact mobile-only trust cues at the apply form entry — mirrors login/signup. */
export default async function ApplyMobileTrustBar() {
  const t = await getTranslations('apply');

  return (
    <p className="apply-mobile-trust-bar" role="note" aria-label={t('mobileTrustBarAria')}>
      {t('mobileTrustBar')}
    </p>
  );
}
