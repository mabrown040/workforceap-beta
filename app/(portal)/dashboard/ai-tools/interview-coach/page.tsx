import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { getUser } from '@/lib/auth/server';

const InterviewCoach = dynamic(() => import('@/components/portal/tools/InterviewCoach'), {
  loading: () => (
    <div className="portal-card portal-card--flat" style={{ padding: '2rem', marginBottom: '1rem' }}>
      <p style={{ margin: 0, color: 'var(--color-on-surface-variant)' }}>Loading interview coach…</p>
    </div>
  ),
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('interviewCoachMetaTitle'),
    description: t('interviewCoachMetaDesc'),
    path: '/dashboard/ai-tools/interview-coach',
  });
}

export default async function InterviewCoachPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login?redirectTo=/dashboard/ai-tools/interview-coach');
  }

  return (
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <div
        style={{
          padding: '1.25rem 2rem 1.5rem',
          borderBottom: '1px solid var(--surface-container-high)',
          background: 'var(--surface-container-low)',
        }}
      >
        <PageHeader
          title="AI Interview Coach"
          subtitle="Run a text-based mock interview and get instant AI feedback."
          breadcrumbs={[
            { label: 'AI Career Toolkit', href: '/dashboard/ai-tools' },
            { label: 'AI Interview Coach' },
          ]}
        />
      </div>

      <div style={{ paddingBottom: '6rem' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
          <InterviewCoach />
          <ToolHistoryPanel userId={user.id} toolType="interview_coach" />
        </div>
        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
