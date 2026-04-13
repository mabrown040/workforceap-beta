import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import CoverLetterForm from '@/components/portal/tools/CoverLetterForm';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cover Letter Builder',
  description: 'Create a tailored cover letter that connects your experience to the job.',
  path: '/dashboard/ai-tools/cover-letter',
});

export default async function CoverLetterPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/cover-letter');

  return (
    <>
      <div style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <PageHeader
            title="Cover Letter Builder"
            subtitle="Tailored cover letters that connect your experience to the job."
            breadcrumbs={[
              { label: 'AI Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'Cover Letter' },
            ]}
          />
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
          <div className="portal-card portal-card--flat" style={{ padding: '1rem', borderRadius: 12, marginBottom: '1rem', background: 'var(--surface-container-low)' }}>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Create a compelling, tailored cover letter in minutes. Our AI connects your experience
              directly to the job requirements, highlighting why you&apos;re the right fit.
            </p>
          </div>

          <div className="portal-card portal-card--flat" style={{ padding: '1rem', borderRadius: 12 }}>
            <CoverLetterForm />
          </div>

          <ToolHistoryPanel userId={user.id} toolType="cover_letter" />
        </div>

        <MobileBottomNav variant="portal" />
      </div>
    </>
  );
}
