import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { getPublicPlacementOutcomes, wilsonInterval } from '@/lib/outcomes/publicPlacementOutcomes';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Placement outcomes',
  description: 'Internal placement aggregates, Wilson intervals, and follow-up queue.',
  path: '/admin/outcomes',
});

export const dynamic = 'force-dynamic';

export default async function AdminOutcomesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/outcomes');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const bundle = await getPublicPlacementOutcomes(prisma);
  const wilson =
    bundle.totalPlaced > 0 ? wilsonInterval(bundle.withRetentionNote, bundle.totalPlaced) : null;

  const missingProgram = await prisma.placementRecord.count({ where: { programSlug: null } });
  const missingFunding = await prisma.placementRecord.count({ where: { fundingSource: null } });
  const missingRetention = await prisma.placementRecord.count({
    where: { AND: [{ retentionStatus: null }, { retentionDecision: null }] },
  });

  const now = new Date();
  const followUpQueue = await prisma.placementRecord.findMany({
    where: {
      retentionDecision: null,
      placedAt: { lte: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { placedAt: 'asc' },
    take: 40,
    include: {
      user: { select: { fullName: true, email: true, enrolledProgram: true } },
    },
  });

  return (
    <PortalPageFrame>
      <PageHeader
        title="Placement outcomes"
        subtitle="Internal dashboard — Wilson intervals are for reporting transparency, not member-facing promises."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Outcomes' }]}
      />

      <div style={{ display: 'grid', gap: '1rem', maxWidth: 960 }}>
        <section className="content-card" style={{ padding: '1rem 1.25rem' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Totals</h2>
          <p style={{ margin: 0, color: 'var(--color-on-surface-variant)' }}>
            Placements: <strong>{bundle.totalPlaced}</strong> · With follow-up note: <strong>{bundle.withRetentionNote}</strong>
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{bundle.asOfLabel}</p>
          {wilson ? (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
              Wilson 95% interval on follow-up rate: {Math.round(wilson.low * 100)}% – {Math.round(wilson.high * 100)}%
            </p>
          ) : null}
        </section>

        <section className="content-card" style={{ padding: '1rem 1.25rem' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Missing data flags</h2>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--color-on-surface-variant)' }}>
            <li>Placement rows missing program slug: {missingProgram}</li>
            <li>Placement rows missing funding source: {missingFunding}</li>
            <li>Placement rows missing retention status and decision: {missingRetention}</li>
          </ul>
        </section>

        <section className="content-card" style={{ padding: '1rem 1.25rem' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Follow-up queue (placed 75+ days ago, no retention decision)</h2>
          {followUpQueue.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-on-surface-variant)' }}>No rows in this window.</p>
          ) : (
            <ul style={{ margin: '0.75rem 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
              {followUpQueue.map((row) => (
                <li key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <span>
                    <Link href={`/admin/members/${row.userId}`} style={{ fontWeight: 600 }}>
                      {row.user.fullName}
                    </Link>
                    <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}> · {row.user.email}</span>
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                    Placed {row.placedAt.toLocaleDateString()} · {row.employerName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
          Public mirror: <Link href="/outcomes">/outcomes</Link>
        </p>
      </div>
    </PortalPageFrame>
  );
}
