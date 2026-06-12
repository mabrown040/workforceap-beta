import { getTranslations } from 'next-intl/server';

const SUPPORT_PHONE_DISPLAY = '(512) 777-1808';
const SUPPORT_PHONE_HREF = 'tel:+15127771808';

/** Compact mobile-only trust cues at the apply form entry — mirrors login/signup. */
export default async function ApplyMobileTrustBar() {
  const t = await getTranslations('apply');

  return (
    <div className="apply-mobile-trust-bar" role="note" aria-label={t('mobileTrustBarAria')}>
      <ul className="apply-mobile-trust-bar__list">
        <li className="apply-mobile-trust-bar__item">
          <span className="apply-mobile-trust-bar__check" aria-hidden="true">
            ✓
          </span>
          <span>{t('mobileTrustBarNoCost')}</span>
        </li>
        <li className="apply-mobile-trust-bar__item">
          <span className="apply-mobile-trust-bar__check" aria-hidden="true">
            ✓
          </span>
          <span>{t('mobileTrustBarNonprofit')}</span>
        </li>
        <li className="apply-mobile-trust-bar__item">
          <span className="apply-mobile-trust-bar__check" aria-hidden="true">
            ✓
          </span>
          <a href={SUPPORT_PHONE_HREF} className="apply-mobile-trust-bar__phone">
            {SUPPORT_PHONE_DISPLAY}
          </a>
        </li>
      </ul>
    </div>
  );
}
