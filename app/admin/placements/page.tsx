import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import DataTable from '@/components/portal/ui/DataTable';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Placements',
    description: 'Every recorded job placement — employer, role, wage, and verification status.',
    path: '/admin/placements',
  });
}

const placementListSelect = {
  id: true,
  employerName: true,
  jobTitle: true,
  startDate: true,
  startDateVerified: true,
  salaryOffered: true,
  placedAt: true,
  user: {
    select: { id: true, fullName: true, email: true, enrolledProgram: true },
  },
} satisfies Prisma.PlacementRecordSelect;

type PlacementRow = Prisma.PlacementRecordGetPayload<{ select: typeof placementListSelect }>;

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSalary(s: number | null): string {
  if (s == null) return '—';
  return `$${s.toLocaleString()}`;
}

export default async function AdminPlacementsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/placements');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const placements: PlacementRow[] = await prisma.placementRecord.findMany({
    orderBy: { placedAt: 'desc' },
    take: 500,
    select: placementListSelect,
  });

  const pendingCount = placements.filter((p) => !p.startDateVerified).length;

  return (
    <PortalPageFrame>
      <PageHeader
        title="Placements"
        subtitle={`${placements.length.toLocaleString()} recorded placements — ${pendingCount.toLocaleString()} awaiting start-date verification.`}
        action={
          <Link href="/admin/placements/new" className="btn btn-outline">
            Record placement
          </Link>
        }
      />

      <div style={{ overflowX: 'auto' }}>
        <DataTable
          variant="admin"
          tableClassName="admin-table"
          rows={placements}
          rowKey={(r) => r.id}
          emptyState={
            <p style={{ color: 'var(--color-on-surface-variant)' }}>
              No placements recorded yet. When a member lands a job, record it here so outcomes
              reporting stays accurate.
            </p>
          }
          columns={[
            {
              key: 'member',
              header: 'Member',
              cell: (r) =>
                r.user ? (
                  <Link href={`/admin/members/${r.user.id}`}>{r.user.fullName ?? r.user.email}</Link>
                ) : (
                  '—'
                ),
            },
            { key: 'employer', header: 'Employer', cell: (r) => r.employerName },
            { key: 'role', header: 'Role', cell: (r) => r.jobTitle },
            { key: 'start', header: 'Start date', cell: (r) => formatDate(r.startDate) },
            { key: 'wage', header: 'Wage', cell: (r) => formatSalary(r.salaryOffered) },
            {
              key: 'status',
              header: 'Status',
              cell: (r) =>
                r.startDateVerified ? (
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>Verified</span>
                ) : (
                  <span style={{ color: '#d97706', fontWeight: 600 }}>Pending verification</span>
                ),
            },
          ]}
        />
      </div>
    </PortalPageFrame>
  );
}
