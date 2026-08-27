import { notFound } from 'next/navigation';
import { MemberProgressKit } from '@/components/portal/kit/pages/member/MemberProgressKit';

/**
 * Storybook-lite showcase — MemberProgressKit (readiness ring + weekly stats
 * + milestones). Preview-only, no auth/DB. See app/dev/dashboard/page.tsx for
 * the pattern.
 */
export const dynamic = 'force-dynamic';

export default function DevMemberProgressPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <MemberProgressKit
      readinessScore={84}
      readinessNote="Finish AWS Practitioner to reach Job Ready."
      weekStats={[
        { value: '5.2', label: 'Hrs Learned', color: 'var(--wa-accent)' },
        { value: '3', label: 'Jobs Applied', color: 'var(--wa-info)' },
        { value: '2', label: 'Modules', color: 'var(--wa-gold)' },
        { value: '+320', label: 'Points', color: 'var(--wa-success)' },
      ]}
      statsHeading="Progress by area"
      milestones={[
        { label: 'Completed intake & eligibility', when: 'May 2', state: 'done' },
        { label: 'Earned first certification', when: 'Mar 18', state: 'done' },
        { label: 'First interview scheduled', when: 'This week', state: 'active' },
        { label: 'Job placement', when: 'Goal', state: 'goal' },
      ]}
      readinessCoachHref="#"
    />
  );
}
