import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import InterestProfilerClient from '@/components/portal/InterestProfilerClient';
import MobileBottomNav from '@/components/MobileBottomNav';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'O*NET Interest Profiler',
  description:
    'Take the Mini Interest Profiler (30 questions) and see how your interests line up with WorkforceAP programs.',
  path: '/dashboard/learning/interest-profiler',
});
}

export default async function InterestProfilerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/learning/interest-profiler');

  return (
    <>
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <InterestProfilerClient />
    </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
