import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import SalaryNegotiationForm from '@/components/portal/tools/SalaryNegotiationForm';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

export const metadata = buildPageMetadata({
  title: 'Salary Negotiation Script',
  description: 'Get a word-for-word script to negotiate your offer—phone or email.',
  path: '/dashboard/ai-tools/salary-negotiation',
});

export default async function SalaryNegotiationPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/salary-negotiation');

  return (
    <>
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid var(--surface-container-high)',
          background: 'var(--surface-container-low)',
        }}
      >
        <PageHeader
          title="Salary Negotiation Script"
          breadcrumbs={[
            { label: 'AI Career Toolkit', href: '/dashboard/ai-tools' },
            { label: 'Salary Negotiation' },
          ]}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--surface-container-highest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: 'var(--color-accent)' }}>payments</span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Salary Negotiation Script</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
              You got an offer -- now negotiate. Enter your numbers and get an exact script for a phone call or email.
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="stitch-card" style={{ padding: '1.5rem' }}>
          <SalaryNegotiationForm />
        </div>
        <ToolHistoryPanel userId={user.id} toolType="salary_negotiation" />
      </div>
    </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
