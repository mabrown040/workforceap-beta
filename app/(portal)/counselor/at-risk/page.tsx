import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { buildPageMetadataAsync } from '@/app/seo';
import AtRiskDashboard from '@/components/portal/counselor/AtRiskDashboard';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'At-Risk Members',
    description: 'Monitor and manage members flagged by the at-risk scoring system.',
    path: '/counselor/at-risk',
  });
}

export const dynamic = 'force-dynamic';

export default async function CounselorAtRiskPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/at-risk');

  const allowed = (await isCounselor(user.id)) || (await isAdmin(user.id));
  if (!allowed) redirect('/dashboard');

  return (
    <PortalPageFrame>
      <PageHeader
        title="At-Risk Members"
        subtitle="Members flagged by the automated risk scoring system. Prioritize outreach by severity."
        breadcrumbs={[
          { label: 'Counselor Portal', href: '/counselor' },
          { label: 'At-Risk' },
        ]}
      />
      <section style={{ padding: '0 clamp(1rem, 4vw, 1.5rem) 2rem' }}>
        <AtRiskDashboard />
      </section>
    </PortalPageFrame>
  );
}
