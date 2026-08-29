import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = buildPageMetadata({
  title: 'Session Details',
  description: 'View your past Lilley career-coaching session.',
  path: '/dashboard/counselor',
  robots: { index: false, follow: false },
});

export default async function CounselorSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/counselor');
  const tCommon = await getTranslations('marketing.common');

  const session = await prisma.aIToolResult.findUnique({
    where: { id, userId: user.id, toolType: 'career_counselor' },
    select: { id: true, output: true, createdAt: true },
  });

  if (!session) notFound();

  return (
    <div style={{ width: '100%', maxWidth: 'var(--max-width, 80rem)', margin: '0 auto' }}>
      <PageHeader
        title="Session Details"
        subtitle={`${new Date(session.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
        breadcrumbs={[
          { label: 'Member Portal', href: '/dashboard' },
          { label: tCommon('aiCounselor'), href: '/dashboard/counselor' },
          { label: 'Session Details' },
        ]}
      />

      <div className="md:wa-hidden" style={{ padding: '0 1rem 6rem' }}>
        <div className="portal-card" style={{ padding: '1.5rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {session.output as string}
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          <Link href="/dashboard/counselor" className="btn btn-outline">
            ← Back to {tCommon('aiCounselor')}
          </Link>
        </div>
      </div>

      <div className="wa-hidden md:wa-block" style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem 3rem' }}>
        <div className="portal-card" style={{ padding: '1.5rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {session.output as string}
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          <Link href="/dashboard/counselor" className="btn btn-outline">
            ← Back to {tCommon('aiCounselor')}
          </Link>
        </div>
      </div>
    </div>
  );
}
