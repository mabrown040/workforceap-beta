'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import OnboardingWizard, { type OnboardingStep } from '@/components/onboarding/OnboardingWizard';
import { PROGRAMS } from '@/lib/content/programs';

const HEAR_OPTIONS = ['Google', 'Referral', 'Social Media', 'Workforce Center', 'Other'] as const;

export type MemberOnboardingWizardProps = {
  initialFullName: string;
  initialPhone: string;
  initialCity: string;
  initialState: string;
  initialZip: string;
  initialProgramInterest: string;
  initialReferralSource: string;
  onComplete?: () => void;
};

export default function MemberOnboardingWizard({
  initialFullName,
  initialPhone,
  initialCity,
  initialState,
  initialZip,
  initialProgramInterest,
  initialReferralSource,
  onComplete: onCompleteProp,
}: MemberOnboardingWizardProps) {
  const router = useRouter();
  const onComplete = onCompleteProp ?? (() => router.refresh());
  const nameParts = initialFullName.trim().split(/\s+/);
  const [firstName, setFirstName] = useState(nameParts[0] ?? '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') ?? '');
  const [phone, setPhone] = useState(initialPhone);
  const [city, setCity] = useState(initialCity);
  const [stateVal, setStateVal] = useState(initialState);
  const [zip, setZip] = useState(initialZip);
  const topPrograms = useMemo(() => PROGRAMS.slice(0, 4), []);
  const [programInterest, setProgramInterest] = useState(
    () => initialProgramInterest.trim() || topPrograms[0]?.title || ''
  );
  const [financialAid, setFinancialAid] = useState<'yes' | 'no' | 'unsure' | ''>('');
  const [referralSource, setReferralSource] = useState(
    HEAR_OPTIONS.includes(initialReferralSource as (typeof HEAR_OPTIONS)[number])
      ? initialReferralSource
      : initialReferralSource
        ? 'Other'
        : ''
  );

  const saveProfileStep = async () => {
    try {
      await fetch('/api/member/dashboard-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || null,
          address: null,
          city: city.trim() || null,
          state: stateVal.trim() || null,
          zip: zip.trim() || null,
          linkedin: null,
          bio: null,
        }),
      });
    } catch {
      /* continue */
    }
  };

  const saveProgramStep = async () => {
    if (!programInterest.trim()) return;
    try {
      await fetch('/api/member/application-onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programInterest: programInterest.trim() }),
      });
    } catch {
      /* continue */
    }
  };

  const saveQuestionsStep = async () => {
    const aid =
      financialAid === 'yes' ? true : financialAid === 'no' ? false : undefined;
    try {
      await fetch('/api/member/dashboard-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim() || 'Member',
          lastName: lastName.trim(),
          phone: phone.trim() || null,
          address: null,
          city: city.trim() || null,
          state: stateVal.trim() || null,
          zip: zip.trim() || null,
          linkedin: null,
          bio: null,
          ...(aid !== undefined ? { financialAidInterest: aid } : {}),
          referralSource: referralSource || null,
        }),
      });
    } catch {
      /* continue */
    }
  };

  const steps: OnboardingStep[] = [
    {
      title: 'Welcome to WorkforceAP',
      subtitle: "You're one step closer to a new career.",
      content: (
        <div className="wa-space-y-3">
          <div className="wa-flex wa-justify-center wa-py-2">
            <Sparkles className="wa-h-12 wa-w-12 wa-text-brand-gold" aria-hidden />
          </div>
          <p className="wa-text-sm wa-leading-relaxed">
            This quick setup (about 2 minutes) gets you on the path to training and job placement. You can skip anytime.
          </p>
        </div>
      ),
    },
    {
      title: 'Complete your profile',
      subtitle: 'We use this to match you with programs and employers.',
      content: (
        <div className="wa-space-y-3">
          <div className="wa-grid wa-grid-cols-1 wa-gap-3 sm:wa-grid-cols-2">
            <label className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
              First name
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
                required
              />
            </label>
            <label className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
              Last name
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
              />
            </label>
          </div>
          <label className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
            Phone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
            />
          </label>
          <div className="wa-grid wa-grid-cols-1 wa-gap-3 sm:wa-grid-cols-3">
            <label className="wa-block wa-text-xs wa-font-medium wa-text-slate-600 sm:wa-col-span-1">
              City
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
              />
            </label>
            <label className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
              State
              <input
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
              />
            </label>
            <label className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
              ZIP
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
              />
            </label>
          </div>
        </div>
      ),
    },
    {
      title: 'Program interest',
      subtitle: 'Pick the path you want to explore first.',
      content: (
        <div className="wa-space-y-2">
          {topPrograms.map((p) => (
            <label
              key={p.slug}
              className={`wa-flex wa-cursor-pointer wa-items-start wa-gap-3 wa-rounded-lg wa-border wa-p-3 wa-text-sm ${
                programInterest === p.title ? 'wa-border-brand-primary wa-bg-blue-50' : 'wa-border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="prog"
                checked={programInterest === p.title}
                onChange={() => setProgramInterest(p.title)}
                className="wa-mt-1"
              />
              <span>
                <span className="wa-font-medium wa-text-slate-900">{p.title}</span>
                <span className="wa-block wa-text-xs wa-text-slate-500">{p.categoryLabel}</span>
              </span>
            </label>
          ))}
        </div>
      ),
    },
    {
      title: 'Quick questions',
      subtitle: 'Help us tailor support and funding options.',
      content: (
        <div className="wa-space-y-4">
          <fieldset>
            <legend className="wa-mb-2 wa-text-xs wa-font-medium wa-text-slate-600">
              Interested in financial aid?
            </legend>
            <div className="wa-flex wa-flex-wrap wa-gap-3">
              {(['yes', 'no', 'unsure'] as const).map((v) => (
                <label key={v} className="wa-flex wa-items-center wa-gap-1.5 wa-text-sm">
                  <input
                    type="radio"
                    name="aid"
                    checked={financialAid === v}
                    onChange={() => setFinancialAid(v)}
                  />
                  {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Not sure'}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
            How did you hear about WorkforceAP?
            <select
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
              className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
            >
              <option value="">Select…</option>
              {HEAR_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>
      ),
    },
    {
      title: "You're all set",
      subtitle: 'Your counselor will reach out within 24–48 hours.',
      content: (
        <div className="wa-space-y-3 wa-text-sm">
          <p>What happens next:</p>
          <ul className="wa-list-disc wa-space-y-1 wa-pl-5 wa-text-slate-600">
            <li>Apply and confirm your path</li>
            <li>Enroll in your program</li>
            <li>Work toward placement with support</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <OnboardingWizard
      portal="member"
      steps={steps}
      onComplete={onComplete}
      stepHooks={{
        beforeNext: async (index) => {
          if (index === 1) await saveProfileStep();
          if (index === 2) await saveProgramStep();
          if (index === 3) await saveQuestionsStep();
        },
      }}
    />
  );
}
