import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Readiness Coach',
  description: 'Talk through your career readiness plan with an AI coach — interviews, certifications, and next steps.',
  path: '/dashboard/ai-tools/readiness-coach',
});

export default async function ReadinessCoachPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/readiness-coach');

  redirect('/dashboard/readiness');
}
