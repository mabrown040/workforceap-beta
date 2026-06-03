import { getTranslations } from 'next-intl/server';

const APPLY_PROGRESS_STEPS = [
  { labelKey: 'stepPersonalInfo', icon: 'person' },
  { labelKey: 'stepBackground', icon: 'work' },
  { labelKey: 'stepProgramSelection', icon: 'school' },
] as const;

type ApplyMobileStepNavProps = {
  activeStep?: 0 | 1 | 2;
};

export default async function ApplyMobileStepNav({ activeStep = 0 }: ApplyMobileStepNavProps) {
  const t = await getTranslations('apply');

  return (
    <nav className="apply-mobile-step-nav" aria-label={t('applicationProgress')}>
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
