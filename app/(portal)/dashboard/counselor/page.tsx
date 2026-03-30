import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import CareerCounselor from '@/components/portal/tools/CareerCounselor';
import { getUser } from '@/lib/auth/server';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Career Counselor',
  description: 'A private voice conversation with an AI career counselor. Leave with a personalized action plan.',
  path: '/dashboard/counselor',
  robots: { index: false, follow: false },
});

export default async function CounselorPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const firstName = user.user_metadata?.full_name?.split(' ')[0] as string | undefined;

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 2rem 1.5rem',
        borderBottom: '1px solid var(--surface-container-high)',
        background: 'var(--surface-container-low)',
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--color-on-surface)' }}>
          AI Career Counselor
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
          Your session is private. Speak naturally — I&apos;m here to help.
        </p>
      </div>

      {/* Mobile */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div style={{ padding: '1.5rem 1rem' }}>
          <CareerCounselor firstName={firstName} />
        </div>
        <MobileBottomNav variant="portal" />
      </div>

      {/* Desktop */}
      <div className="wa-hidden wa-md:wa-block">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
          <CareerCounselor firstName={firstName} />
        </div>
      </div>
    </div>
  );
}
