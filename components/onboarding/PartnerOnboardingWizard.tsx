'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UsersRound } from 'lucide-react';
import OnboardingWizard, { type OnboardingStep } from '@/components/onboarding/OnboardingWizard';

const ORG_TYPES = [
  'Workforce Center',
  'Nonprofit',
  'Community College',
  'Government Agency',
  'Other',
] as const;

export type PartnerOnboardingWizardProps = {
  partnerName: string;
  organizationType: string;
  contactName: string;
  contactPhone: string;
  referralApplyUrl: string;
  initialStep?: number;
  onComplete?: () => void;
};

export default function PartnerOnboardingWizard({
  partnerName: initialName,
  organizationType: initialType,
  contactName: initialContact,
  contactPhone: initialPhone,
  referralApplyUrl,
  initialStep = 0,
  onComplete: onCompleteProp,
}: PartnerOnboardingWizardProps) {
  const router = useRouter();
  const onComplete = onCompleteProp ?? (() => router.refresh());

  const [name, setName] = useState(initialName);
  const [organizationType, setOrganizationType] = useState(initialType || '');
  const [contactName, setContactName] = useState(initialContact || '');
  const [contactPhone, setContactPhone] = useState(initialPhone || '');

  const saveOrg = async () => {
    try {
      await fetch('/api/partner/onboarding-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          organizationType: organizationType || null,
          contactName: contactName.trim() || null,
          contactPhone: contactPhone.trim() || null,
        }),
      });
    } catch {
      /* continue */
    }
  };

  const steps: OnboardingStep[] = [
    {
      title: 'Welcome, partner',
      subtitle: 'Track referrals and outcomes in one place.',
      content: (
        <div className="wa-space-y-3">
          <div className="wa-flex wa-justify-center wa-py-2">
            <UsersRound className="wa-h-12 wa-w-12 wa-text-brand-accent" aria-hidden />
          </div>
          <p className="wa-text-sm wa-leading-relaxed">
            Monitor training progress and placements for members you refer — so you can celebrate wins with your community.
          </p>
        </div>
      ),
    },
    {
      title: 'Your organization',
      subtitle: 'Confirm how we should list you.',
      content: (
        <div className="wa-space-y-3">
          <label htmlFor="partner-org-name" className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
            Organization name
            <input
              id="partner-org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
            />
          </label>
          <label htmlFor="partner-org-type" className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
            Organization type
            <select
              id="partner-org-type"
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value)}
              className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
            >
              <option value="">Select…</option>
              {ORG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="partner-contact-name" className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
            Primary contact name
            <input
              id="partner-contact-name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
            />
          </label>
          <label htmlFor="partner-contact-phone" className="wa-block wa-text-xs wa-font-medium wa-text-slate-600">
            Primary contact phone
            <input
              id="partner-contact-phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="wa-mt-1 wa-w-full wa-rounded-lg wa-border wa-border-slate-200 wa-px-3 wa-py-2 wa-text-sm"
            />
          </label>
        </div>
      ),
    },
    {
      title: 'How referrals work',
      subtitle: 'Share one link; we attribute their journey to you.',
      content: (
        <div className="wa-space-y-4 wa-text-sm">
          <p className="wa-text-slate-600">
            Pipeline: <strong>Referred</strong> → Applied → Enrolled → Certified → Placed
          </p>
          <div>
            <p className="wa-mb-1 wa-text-xs wa-font-medium wa-text-slate-600">Your referral link</p>
            <code className="wa-block wa-break-all wa-rounded-lg wa-bg-slate-100 wa-p-3 wa-text-xs">{referralApplyUrl}</code>
          </div>
        </div>
      ),
    },
    {
      title: "You're ready",
      subtitle: 'Your dashboard lists every referred member and status.',
      content: (
        <p className="wa-text-sm wa-text-slate-600">
          Use the members and milestones views to follow up and keep momentum.
        </p>
      ),
    },
  ];

  return (
    <OnboardingWizard
      portal="partner"
      steps={steps}
      onComplete={onComplete}
      initialStep={initialStep}
      stepHooks={{
        beforeNext: async (index) => {
          if (index === 1) await saveOrg();
        },
      }}
    />
  );
}
