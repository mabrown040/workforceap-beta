import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { MemberToolkitKit } from '@/components/portal/kit/pages/member/MemberToolkitKit';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Career Toolkit',
    description: 'AI career tools tuned to your training path and local job market.',
    path: '/dashboard/toolkit',
  });
}

export default async function DashboardToolkitPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/toolkit');

  return <MemberToolkitKit />;
}
