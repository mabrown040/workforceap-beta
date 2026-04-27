import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import SessionsIndexBody from '@/components/portal/sessions/SessionsIndexBody';

export const metadata: Metadata = buildPageMetadata({
  title: 'In-office sessions',
  description: 'Run a guided 30-minute session with a member. Build profile, resume, cover letter, and interview prep together.',
  path: '/counselor/sessions',
});

/**
 * In-office sessions index — counselor view.
 *
 * Body extracted to <SessionsIndexBody actor="counselor" /> so the same
 * page renders correctly when admin opens the mirrored /admin/sessions
 * (admin stays in admin chrome instead of teleporting into counselor).
 */
export default async function CounselorSessionsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/sessions');

  const [counselorRole, adminRole] = await Promise.all([isCounselor(user.id), isAdmin(user.id)]);
  // Admins who aren't counselors belong in admin chrome, not counselor chrome
  if (!counselorRole) {
    if (adminRole) redirect('/admin/sessions');
    redirect('/dashboard');
  }

  return <SessionsIndexBody actor="counselor" actorUserId={user.id} />;
}
