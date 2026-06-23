import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Exports',
  description: 'Download referral outcomes as CSV.',
  path: '/partner/exports',
});
}

export default async function PartnerExportsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/exports');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  return (
    <PortalPageFrame>
    <div style={{ paddingBottom: '6rem' }} className="md:wa-pb-8">
      <PageHeader
        title="Exports"
        subtitle="Download a CSV of every referred member, stage, program progress, and last update (partner-scoped)."
        breadcrumbs={[{ label: 'Partner Portal', href: '/partner' }, { label: 'Exports' }]}
      />
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1rem', maxWidth: 560 }}>
        The file includes only members referred by your organization. Open in Excel or Google Sheets.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <a href="/api/partner/export/referrals" className="btn btn-primary">
          Download referrals.csv
        </a>
        <a href="/api/partner/export/referrals?preset=outcomes" className="btn btn-muted">
          Outcomes preset (placement columns)
        </a>
        <a href="/api/partner/export/referrals?preset=demographics" className="btn btn-muted">
          Demographics + placement (funder reporting)
        </a>
      </div>
    </div>
    </PortalPageFrame>
  );
}
