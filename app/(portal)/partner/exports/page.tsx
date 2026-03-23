import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Exports',
  description: 'Download referral outcomes as CSV.',
  path: '/partner/exports',
});

export default async function PartnerExportsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/exports');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  return (
    <div>
      <PageHeader
        title="Exports"
        subtitle="Download a CSV of every referred member, stage, program progress, and last update (partner-scoped)."
      />
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1rem', maxWidth: 560 }}>
        The file includes only members referred by your organization. Open in Excel or Google Sheets.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <a href="/api/partner/export/referrals" className="btn btn-primary">
          Download referrals.csv
        </a>
        <a href="/api/partner/export/referrals?preset=outcomes" className="btn btn-secondary">
          Outcomes preset (placement columns)
        </a>
      </div>
    </div>
  );
}
