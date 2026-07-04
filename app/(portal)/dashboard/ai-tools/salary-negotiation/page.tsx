import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import SalaryNegotiationForm from '@/components/portal/tools/SalaryNegotiationForm';
import PageHeader from '@/components/portal/PageHeader';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('salaryNegotiationMetaTitle'),
    description: t('salaryNegotiationMetaDesc'),
    path: '/dashboard/ai-tools/salary-negotiation',
  });
}

export default async function SalaryNegotiationPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/salary-negotiation');

  return (
    <>
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
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
          subtitle="You got an offer -- now negotiate. Enter your numbers and get an exact script for a phone call or email."
          breadcrumbs={[
            { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
            { label: 'Salary Negotiation' },
          ]}
        />
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
          <SalaryNegotiationForm />
        </div>
        <ToolHistoryPanel userId={user.id} toolType="salary_negotiation" />
      </div>
    </div>    </>
  );
}
