import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import MobileBottomNav from '@/components/MobileBottomNav';
import ElevatorPitchClient from '@/components/portal/tools/ElevatorPitchClient';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Elevator Speech',
  description: 'AI-crafted 10-20 second elevator speech with saved history, email delivery, and voice rehearsal recording.',
  path: '/dashboard/ai-tools/elevator-pitch',
});

export default async function ElevatorPitchPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/elevator-pitch');

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      <div style={{ padding: '1.25rem 2rem 1.5rem', borderBottom: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
          <Link href="/dashboard/ai-tools" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>AI Tools</Link>
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }} aria-hidden>chevron_right</span>
          <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>AI Elevator Speech</span>
        </nav>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>AI Elevator Speech</h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', maxWidth: 640 }}>
          Answer a few quick questions. AI writes your 10–20 second intro, saves it, emails it to you, then lets you rehearse it with your voice.
        </p>
      </div>
      <div style={{ paddingBottom: '6rem' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem 1rem 2rem' }}>
          <ElevatorPitchClient />
          <ToolHistoryPanel
            userId={user.id}
            toolTypes={['career_counselor']}
            title="Previous AI elevator speeches"
            emptyMessage="No saved elevator speeches yet. Generate your first one above."
          />
        </div>
        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
