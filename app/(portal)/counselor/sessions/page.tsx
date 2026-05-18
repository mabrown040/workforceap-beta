import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import SessionsIndexBody from '@/components/portal/sessions/SessionsIndexBody';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('counselor');
  return buildPageMetadataAsync({
    title: t('inOfficeSessionsMetaTitle'),
    description: t('inOfficeSessionsMetaDesc'),
    path: '/counselor/sessions',
  });
}

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
