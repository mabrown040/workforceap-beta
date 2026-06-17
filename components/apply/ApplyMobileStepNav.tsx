import { getTranslations } from 'next-intl/server';

/** Shorter labels than the desktop sidebar — mobile step pills are one-third width. */
const APPLY_PROGRESS_STEPS = [
  { labelKey: 'stepPersonalInfoMobile', icon: 'person' },
  { labelKey: 'stepBackgroundMobile', icon: 'work' },
  { labelKey: 'stepProgramSelectionMobile', icon: 'school' },
] as const;

type ApplyMobileStepNavProps = {
  activeStep?: 0 | 1 | 2;
};

export default async function ApplyMobileStepNav({ activeStep = 0 }: ApplyMobileStepNavProps) {
  const t = await getTranslations('apply');
  const totalSteps = APPLY_PROGRESS_STEPS.length;

  return (
    <nav className="apply-mobile-step-nav" aria-label={t('applicationProgress')}>
      <p className="apply-mobile-step-nav__summary">
        {t('mobileStepSummary', { current: activeStep + 1, total: totalSteps })}
      </p>
      <ol className="apply-mobile-step-nav__list">
        {APPLY_PROGRESS_STEPS.map((step, i) => (
          <li
            key={step.labelKey}
            className={`apply-mobile-step-nav__item${i === activeStep ? ' apply-mobile-step-nav__item--active' : ''}`}
            aria-current={i === activeStep ? 'step' : undefined}
          >
            <span className="apply-mobile-step-nav__index" aria-hidden="true">
              {i + 1}
            </span>
            <span className="material-symbols-outlined apply-mobile-step-nav__icon" aria-hidden="true">
              {step.icon}
            </span>
            <span className="apply-mobile-step-nav__label">
              {t(step.labelKey as Parameters<typeof t>[0])}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
