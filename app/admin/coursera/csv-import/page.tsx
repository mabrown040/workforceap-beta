import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { buildPageMetadata } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import CourseraCsvImportClient from '@/components/admin/CourseraCsvImportClient';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Coursera CSV import',
  description: 'Import the Coursera "Learner activity & progress" CSV report (CourseActivity or LearningPathActivity tab) for backfill and ongoing redundancy.',
  path: '/admin/coursera/csv-import',
});

export const dynamic = 'force-dynamic';

export default async function AdminCourseraCsvImportPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/coursera/csv-import');
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  return (
    <PortalPageFrame>
      <PageHeader
        title="Coursera CSV import"
        subtitle="Upload either the CourseActivity or LearningPathActivity tab from a Coursera enterprise export."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Coursera', href: '/admin/coursera' },
          { label: 'CSV import' },
        ]}
      />

      <div style={{ marginBottom: '1rem' }}>
        <div className="content-card" style={{ padding: '1rem 1.1rem' }}>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <strong>Where to download the CSV</strong>
            <span style={{ color: 'var(--color-on-surface-variant)' }}>
              Coursera admin → Analytics → Reports → <em>Learner activity &amp; progress</em>{' '}
              → Customise &amp; Generate. The export ZIP contains six CSVs; this importer
              consumes two of them: <code>CourseActivity ... .csv</code> for per-course
              progress and <code>LearningPathActivity ... .csv</code> for badge / specialization
              progress. CSV type is auto-detected from the header row. The other tabs are
              aggregate-only and ignored.
            </span>
            <span style={{ color: 'var(--color-on-surface-variant)' }}>
              Schedule daily delivery to <code>michael.brown2@workforceap.org</code> from the same screen
              for an ongoing redundancy feed alongside the realtime xAPI bridge.
            </span>
          </div>
        </div>
      </div>

      <CourseraCsvImportClient />
    </PortalPageFrame>
  );
}
