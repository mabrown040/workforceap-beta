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
    />
  );
}
