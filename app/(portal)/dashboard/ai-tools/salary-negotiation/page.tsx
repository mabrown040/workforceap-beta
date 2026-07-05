import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { DesignSurface, SectionHeader } from '@/components/portal/kit';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import SalaryNegotiationForm from '@/components/portal/tools/SalaryNegotiationForm';
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
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.25rem 1rem 3rem' }} className="wa-space-y-5">
        <PortalBreadcrumb
          items={[
            { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
            { label: 'Salary Negotiation' },
          ]}
        />
        <SectionHeader
          kicker="AI Career Toolkit"
          title="Salary Negotiation Script"
          goal="You got an offer — now negotiate. Enter your numbers and get an exact script for a phone call or email."
        />
        <div className="wa-kit-card">
          <SalaryNegotiationForm />
        </div>
        <ToolHistoryPanel userId={user.id} toolType="salary_negotiation" />
      </div>
    </DesignSurface>
  );
}
