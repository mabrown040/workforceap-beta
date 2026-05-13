import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { buildPageMetadataAsync } from '@/app/seo';
import AIEfficacyDashboard from './AIEfficacyDashboard';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'AI Tool Efficacy',
    description: 'Measure whether AI tools improve placement outcomes',
    path: '/admin/analytics/ai-efficacy',
  });
}

export default async function AIEfficacyPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/analytics/ai-efficacy');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  return <AIEfficacyDashboard />;
}
