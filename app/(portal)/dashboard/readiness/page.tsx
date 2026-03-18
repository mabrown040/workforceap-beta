import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import Footer from '@/components/Footer';
import ReadinessMemberClient from './ReadinessMemberClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Career Readiness',
  description: 'Your job readiness checklist.',
  path: '/dashboard',
});

export default async function DashboardReadinessPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/readiness');

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Career Readiness</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        This checklist tracks your journey from training to career. Your counselor will update it as you hit milestones.
      </p>
      <ReadinessMemberClient />
      <Footer />
    </div>
  );
}
