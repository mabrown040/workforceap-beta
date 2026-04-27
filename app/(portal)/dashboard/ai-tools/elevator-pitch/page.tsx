import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import ElevatorPitchClient from '@/components/portal/tools/ElevatorPitchClient';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Elevator Introduction',
  description: 'AI-crafted 10-20 second elevator introduction with saved history, email delivery, and voice rehearsal recording.',
  path: '/dashboard/ai-tools/elevator-pitch',
});

export default async function ElevatorPitchPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/elevator-pitch');

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      <div style={{ padding: '1.25rem 2rem 1.5rem', borderBottom: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
        <PageHeader
          title="AI Elevator Introduction"
          subtitle="Answer a few quick questions. AI writes your 10–20 second intro, saves it, emails it to you, then lets you rehearse it with your voice."
          breadcrumbs={[
            { label: 'AI Career Toolkit', href: '/dashboard/ai-tools' },
            { label: 'AI Elevator Introduction' },
          ]}
        />
      </div>
      <div style={{ paddingBottom: '6rem' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem 1rem 2rem' }}>
          <ElevatorPitchClient />
          <ToolHistoryPanel
            userId={user.id}
            toolTypes={['career_counselor']}
            title="Previous AI elevator introductions"
            emptyMessage="No saved elevator introductions yet. Generate your first one above."
          />
        </div>
        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
