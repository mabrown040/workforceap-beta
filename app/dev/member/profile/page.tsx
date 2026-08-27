import { notFound } from 'next/navigation';
import { MemberProfileKit } from '@/components/portal/kit/pages/member/MemberProfileKit';

/**
 * Storybook-lite showcase — MemberProfileKit, fully populated.
 * `live` is left at its default (false) so Save/toggles stay local-only —
 * no PATCH calls to /api/member/dashboard-profile or /api/member/settings.
 * Preview-only, no auth/DB. See app/dev/dashboard/page.tsx for the pattern.
 */
export const dynamic = 'force-dynamic';

export default function DevMemberProfilePage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <MemberProfileKit
      name="Mike Brown"
      initials="MB"
      headline="AWS Cloud Practitioner candidate · Austin, TX"
      email="mike.brown@email.com"
      location="Austin, TX"
      programInterest="Cloud & IT"
      programOptions={['Cloud & IT', 'Data & AI', 'Healthcare', 'Skilled Trades']}
      badges={[
        { label: '2 certs', bg: 'var(--wa-gold-soft)', color: 'var(--wa-gold)' },
        { label: '84 readiness', bg: 'var(--wa-success-soft)', color: 'var(--wa-success)' },
        { label: '12-day streak', bg: 'var(--wa-accent-soft)', color: 'var(--wa-accent)' },
      ]}
      notifications={[
        { key: 'jobs', label: 'Job matches', enabled: true },
        { key: 'counselor', label: 'Counselor messages', enabled: true },
        { key: 'reminders', label: 'Course reminders', enabled: false },
        { key: 'recap', label: 'Weekly recap email', enabled: true },
      ]}
    />
  );
}
