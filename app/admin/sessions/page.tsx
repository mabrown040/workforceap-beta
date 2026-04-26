import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import SessionsIndexBody from '@/components/portal/sessions/SessionsIndexBody';

export const metadata: Metadata = buildPageMetadata({
  title: 'In-office sessions',
  description: 'Run a guided 30-minute session with a member. Build profile, resume, cover letter, and interview prep together.',
  path: '/admin/sessions',
});

/**
 * In-office sessions — admin view. Mirrors /counselor/sessions but stays
 * inside admin chrome (sidebar, breadcrumbs, etc.) per user direction
 * 2026-04-26: "if opened from admin, should stay in admin, not counselor."
 */
export default async function AdminSessionsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/sessions');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  return <SessionsIndexBody actor="admin" actorUserId={user.id} />;
}
