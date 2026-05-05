import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import ResumeCoachWorkspace from '@/components/portal/ResumeCoachWorkspace';
import VoiceSessionIntroStrip from '@/components/portal/tools/VoiceSessionIntroStrip';
import { getUser } from '@/lib/auth/server';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Resume & Experience Enhancer',
  description: 'Practice your story out loud and refine your resume in a dedicated voice coaching flow.',
  path: '/dashboard/ai-tools/resume-coach',
});
}

export default async function ResumeCoachPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/resume-coach');

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      <div style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1.25rem 2rem 1.5rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <PageHeader
            title="Resume & Experience Enhancer"
            subtitle="Work through your background out loud, keep your live draft synced as you go, and review suggested rewrites during or after the session."
            breadcrumbs={[
              { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'Resume & Experience Enhancer' },
            ]}
          />
        </div>

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
          <VoiceSessionIntroStrip
            items={[
              'Talk through accomplishments naturally',
              'Review coach suggestions before applying them to your draft',
              'Keep your saved resume aligned with the live voice session',
            ]}
          />

          <ResumeCoachWorkspace />
        </div>      </div>
    </div>
  );
}
