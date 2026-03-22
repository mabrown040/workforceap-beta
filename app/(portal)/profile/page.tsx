import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';

/**
 * Canonical member profile lives in the dashboard shell (/dashboard/profile).
 * This route exists for older bookmarks and external links.
 */
export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/profile');
  redirect('/dashboard/profile');
}
