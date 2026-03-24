'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface OnboardingStep {
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

export interface OnboardingWizardProps {
  portal: 'member' | 'employer' | 'partner';
  steps: OnboardingStep[];
  onComplete: () => void;
  /** Called before leaving step `index` (after Back/Next; index is current step). */
  stepHooks?: {
    beforeNext?: (stepIndex: number) => void | Promise<void>;
  };
  /** Last step provides its own actions (e.g. employer dual CTA). */
  hideFooterOnLastStep?: boolean;
}

export default function OnboardingWizard({
  portal,
  steps,
  onComplete,
  stepHooks,
  hideFooterOnLastStep,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const finish = useCallback(async () => {
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal }),
      });
    } catch {
      /* still dismiss */
    }
    setExiting(true);
    setTimeout(() => onComplete(), 200);
  }, [onComplete, portal]);

  const skip = useCallback(() => {
    void finish();
  }, [finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  useEffect(() => {
    const root = panelRef.current;
    if (!root) return;
    const focusables = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    const list = focusables();
    list[0]?.focus();

    const onTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onTrap);
    return () => root.removeEventListener('keydown', onTrap);
  }, [step]);

  const last = step >= steps.length - 1;

  const goNext = () => {
    void (async () => {
      await stepHooks?.beforeNext?.(step);
      if (last && !(hideFooterOnLastStep && step === steps.length - 1)) {
        await finish();
      } else if (!last) {
        setStep((s) => Math.min(s + 1, steps.length - 1));
      }
    })();
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const current = steps[step];
  if (!current) return null;

  return (
    <div
      className="wa-fixed wa-inset-0 wa-z-50 wa-flex wa-items-center wa-justify-center wa-p-4 wa-bg-slate-900/60 wa-backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-onboarding-title"
    >
      <div
        ref={panelRef}
        className={`wa-relative wa-w-full wa-max-w-lg wa-max-h-[90vh] wa-overflow-y-auto wa-rounded-xl wa-bg-white wa-shadow-xl wa-ring-1 wa-ring-black/5 wa-transition-opacity wa-duration-200 dark:wa-bg-slate-900 dark:wa-ring-slate-700 ${exiting ? 'wa-opacity-0' : 'wa-opacity-100'}`}
      >
        <div className="wa-sticky wa-top-0 wa-z-10 wa-bg-white wa-border-b wa-border-slate-100 wa-px-6 wa-pt-5 wa-pb-3 dark:wa-border-slate-700 dark:wa-bg-slate-900">
          <div className="wa-flex wa-gap-1.5 wa-justify-center wa-mb-3">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`wa-h-2 wa-w-2 wa-rounded-full ${i === step ? 'wa-bg-brand-accent' : 'wa-bg-slate-200'}`}
                aria-hidden
              />
            ))}
          </div>
          <h2 id="wa-onboarding-title" className="wa-text-lg wa-font-semibold wa-text-slate-900 dark:wa-text-slate-100">
            {current.title}
          </h2>
          {current.subtitle ? (
            <p className="wa-mt-1 wa-text-sm wa-text-slate-600 dark:wa-text-slate-300">{current.subtitle}</p>
          ) : null}
        </div>

        <div className="wa-px-6 wa-py-4 wa-text-slate-800 dark:wa-text-slate-200">{current.content}</div>

        {!(hideFooterOnLastStep && last) ? (
          <div className="wa-flex wa-items-center wa-justify-between wa-gap-3 wa-border-t wa-border-slate-100 wa-px-6 wa-py-4 dark:wa-border-slate-700">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="wa-rounded-lg wa-border wa-border-slate-200 wa-bg-white wa-px-4 wa-py-2 wa-text-sm wa-font-medium wa-text-slate-800 disabled:wa-opacity-40 dark:wa-border-slate-600 dark:wa-bg-slate-800 dark:wa-text-slate-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              className="wa-rounded-lg wa-bg-brand-accent wa-px-4 wa-py-2 wa-text-sm wa-font-semibold wa-text-white hover:wa-bg-brand-accent-dark"
            >
              {last ? 'Finish' : 'Next'}
            </button>
          </div>
        ) : (
          <div className="wa-border-t wa-border-slate-100 wa-px-6 wa-py-3 dark:wa-border-slate-700">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="wa-rounded-lg wa-border wa-border-slate-200 wa-bg-white wa-px-4 wa-py-2 wa-text-sm wa-font-medium wa-text-slate-800 disabled:wa-opacity-40 dark:wa-border-slate-600 dark:wa-bg-slate-800 dark:wa-text-slate-100"
            >
              Back
            </button>
          </div>
        )}

        <div className="wa-relative wa-pb-10">
          <button
            type="button"
            onClick={() => void skip()}
            className="wa-absolute wa-bottom-3 wa-right-4 wa-text-xs wa-text-slate-500 hover:wa-text-slate-700 wa-underline dark:wa-text-slate-400 dark:hover:wa-text-slate-200"
          >
            Skip setup
          </button>
        </div>
      </div>
    </div>
  );
}

