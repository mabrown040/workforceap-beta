import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { buildPageMetadataAsync } from '@/app/seo';
import QuarterlyOutcomesClient from './QuarterlyOutcomesClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Quarterly Outcomes',
    description: 'Grant-ready quarterly outcomes report',
    path: '/admin/reports/quarterly-outcomes',
  });
}

export default async function QuarterlyOutcomesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/reports/quarterly-outcomes');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  return <QuarterlyOutcomesClient />;
}
