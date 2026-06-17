'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import OnboardingWizard, { type OnboardingStep } from '@/components/onboarding/OnboardingWizard';

const INDUSTRIES = ['Technology', 'Healthcare', 'Construction', 'Logistics', 'Finance', 'Retail', 'Other'] as const;
const SIZES = ['1–10', '11–50', '51–200', '200+'] as const;

export type EmployerOnboardingWizardProps = {
  companyName: string;
  industry: string;
  companySize: string;
  companyWebsite: string;
  initialStep?: number;
  onComplete?: () => void;
};

export default function EmployerOnboardingWizard({
  companyName: initialName,
  industry: initialIndustry,
  companySize: initialSize,
  companyWebsite: initialWeb,
  initialStep = 0,
  onComplete: onCompleteProp,
}: EmployerOnboardingWizardProps) {
  const router = useRouter();
  const onComplete = onCompleteProp ?? (() => router.refresh());
  const [companyName, setCompanyName] = useState(initialName);
  const [industry, setIndustry] = useState(initialIndustry || '');
  const [companySize, setCompanySize] = useState(initialSize || '');
  const [companyWebsite, setCompanyWebsite] = useState(initialWeb || '');

  const saveCompany = async () => {
    try {
      await fetch('/api/employer/onboarding-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          industry: industry || null,
          companySize: companySize || null,
          companyWebsite: companyWebsite.trim() || '',
        }),
      });
    } catch {
      /* continue */
    }
  };

  const completeAnd = async (fn: () => void) => {
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal: 'employer' }),
      });
    } catch {
      /* dismiss anyway */
    }
    fn();
  };

  const steps: OnboardingStep[] = [
    {
      title: 'Welcome to the Employer Portal',
      subtitle: 'Hire pre-screened talent from WorkforceAP programs.',
      content: (
        <div className="wa-space-y-4">
          <div className="wa-flex wa-justify-center wa-py-2">
            <Building2 className="wa-h-16 wa-w-16 wa-text-brand-primary" aria-hidden />
          </div>
          <p className="wa-text-base wa-leading-relaxed wa-text-center">
            Post jobs, review AI-matched candidates, and move applicants through your pipeline — all in one place.
          </p>
          <div className="wa-bg-slate-50 wa-border wa-border-slate-200 wa-rounded-lg wa-p-4 wa-space-y-2 dark:wa-bg-slate-800 dark:wa-border-slate-700">
            <h4 className="wa-font-semibold wa-text-sm wa-mb-2">What you can do:</h4>
            <ul className="wa-space-y-1.5 wa-text-sm wa-text-slate-700 dark:wa-text-slate-300">
              <li className="wa-flex wa-items-start wa-gap-2">
                <span className="wa-text-green-600 wa-mt-0.5">✓</span>
                <span>Post unlimited job openings</span>
              </li>
              <li className="wa-flex wa-items-start wa-gap-2">
                <span className="wa-text-green-600 wa-mt-0.5">✓</span>
                <span>Get AI-matched candidates based on skills and program fit</span>
              </li>
              <li className="wa-flex wa-items-start wa-gap-2">
                <span className="wa-text-green-600 wa-mt-0.5">✓</span>
                <span>Track applicants through your hiring pipeline</span>
              </li>
              <li className="wa-flex wa-items-start wa-gap-2">
                <span className="wa-text-green-600 wa-mt-0.5">✓</span>
                <span>Access pre-screened, career-ready candidates</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Company setup',
      subtitle: 'Tell us about your organization.',
      content: (
        <div className="wa-space-y-3">
          <label htmlFor="employer-company-name" className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
            Company name
            <input
              id="employer-company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
            />
          </label>
          <label htmlFor="employer-industry" className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
            Industry
            <select
              id="employer-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
            >
              <option value="">Select…</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="employer-company-size" className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
            Company size
            <select
              id="employer-company-size"
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
            >
              <option value="">Select…</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="employer-website" className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
            Website (optional)
            <input
              id="employer-website"
              type="url"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              placeholder="https://"
              className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
            />
          </label>
        </div>
      ),
    },
    {
      title: 'How hiring works',
      subtitle: 'Three steps from posting to interviews.',
      content: (
        <ol className="wa-list-decimal wa-space-y-3 wa-pl-5 wa-text-sm wa-text-slate-700">
          <li>
            <strong className="wa-text-slate-900">Post a job</strong> — about 2 minutes for a draft.
          </li>
          <li>
            <strong className="wa-text-slate-900">AI matching</strong> — we surface pre-screened candidates.
          </li>
          <li>
            <strong className="wa-text-slate-900">Review &amp; interview</strong> — track pipeline in your portal.
          </li>
        </ol>
      ),
    },
    {
      title: 'Post your first job?',
      subtitle: 'You can always come back from the header.',
      content: (
        <div className="wa-flex wa-flex-col wa-gap-3">
          <button
            type="button"
            onClick={() =>
              void completeAnd(() => {
                onComplete();
                router.push('/employer/jobs/new');
              })
            }
            className="wa-rounded-lg wa-bg-brand-accent wa-py-3 wa-text-center wa-text-sm wa-font-semibold wa-text-white hover:wa-bg-brand-accent-dark"
          >
            Post a job now
          </button>
          <button
            type="button"
            onClick={() => void completeAnd(() => onComplete())}
            className="wa-rounded-lg wa-border wa-border-slate-200 wa-bg-white wa-py-3 wa-text-center wa-text-sm wa-font-medium wa-text-slate-800"
          >
            Explore the portal first
          </button>
        </div>
      ),
    },
  ];

  return (
    <OnboardingWizard
      portal="employer"
      steps={steps}
      onComplete={onComplete}
      initialStep={initialStep}
      stepHooks={{
        beforeNext: async (index) => {
          if (index === 1) await saveCompany();
        },
      }}
      /** Last step uses in-content buttons; hide default footer on step 3 */
      hideFooterOnLastStep
    />
  );
}
