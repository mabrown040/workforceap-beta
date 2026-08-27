import { notFound } from 'next/navigation';
import { MemberProgressKit } from '@/components/portal/kit/pages/member/MemberProgressKit';

/**
 * Storybook-lite showcase — MemberProgressKit (readiness ring + category
 * scores + milestones). Preview-only, no auth/DB.
 */
export const dynamic = 'force-dynamic';

export default function DevMemberProgressPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <MemberProgressKit
      readinessScore={84}
      readinessNote="Next: finish AWS Practitioner."
      statsHeading="Progress by area"
      readinessCoachHref="/dev/member/toolkit"
      weekStats={[
        { value: '80%', label: 'Resume & profile', color: 'var(--wa-info)' },
        { value: '78%', label: 'Training & certs', color: 'var(--wa-accent)' },
        { value: '60%', label: 'Interview & jobs', color: 'var(--wa-success)' },
        { value: '40%', label: 'Engagement', color: 'var(--wa-gold)' },
      ]}
      milestones={[
        { label: 'Resume & profile', when: '80%', state: 'done' },
        { label: 'Training & certs', when: 'In progress', state: 'active' },
        { label: 'Interview & jobs', when: 'Goal', state: 'goal' },
        { label: 'Engagement', when: 'Goal', state: 'goal' },
      ]}
    />
  );
}
