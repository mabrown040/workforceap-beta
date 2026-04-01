import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';

export const metadata: Metadata = buildPageMetadata({
  title: 'Job Applications',
  description: 'Track your job applications and interview progress.',
  path: '/applications',
});

export default async function ApplicationsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/job-applications');
  redirect('/dashboard/job-applications');
}
