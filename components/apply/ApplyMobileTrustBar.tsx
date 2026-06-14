import { getTranslations } from 'next-intl/server';

const SUPPORT_PHONE_DISPLAY = '(512) 777-1808';
const SUPPORT_PHONE_HREF = 'tel:+15127771808';

/** Compact mobile-only trust cues at the apply form entry — mirrors login/signup. */
export default async function ApplyMobileTrustBar() {
  const t = await getTranslations('apply');

  return (
    <div className="apply-mobile-trust-bar" role="note" aria-label={t('mobileTrustBarAria')}>
      <p className="apply-mobile-trust-bar__line">
        <span className="apply-mobile-trust-bar__cue">
          <span className="apply-mobile-trust-bar__check" aria-hidden="true">
            ✓
          </span>
          {t('mobileTrustBarNoCost')}
        </span>
        <span className="apply-mobile-trust-bar__sep" aria-hidden="true">
          ·
        </span>
        <span className="apply-mobile-trust-bar__cue">
          <span className="apply-mobile-trust-bar__check" aria-hidden="true">
            ✓
          </span>
          {t('mobileTrustBarNonprofit')}
        </span>
        <span className="apply-mobile-trust-bar__sep" aria-hidden="true">
          ·
        </span>
        <span className="apply-mobile-trust-bar__phone-wrap">
          {t('questionsCall')}{' '}
          <a
            href={SUPPORT_PHONE_HREF}
            className="apply-mobile-trust-bar__phone"
            aria-label={t('mobileTrustBarPhoneAria', { phone: SUPPORT_PHONE_DISPLAY })}
          >
            {SUPPORT_PHONE_DISPLAY}
          </a>
        </span>
      </p>
    </div>
  );
}
