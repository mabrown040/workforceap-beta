import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { parseWioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';
import { wioaReviewLabel } from '@/lib/wioa/wioaReview';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – WIOA screening queue',
  description: 'Members who submitted the WIOA self-screening questionnaire.',
  path: '/admin/wioa-screening',
});

export default async function AdminWioaScreeningQueuePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/wioa-screening');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const rows = await prisma.user.findMany({
    where: { deletedAt: null, wioaQualificationJson: { not: Prisma.JsonNull } },
    select: {
      id: true,
      fullName: true,
      email: true,
      wioaQualificationJson: true,
      wioaReviewStatus: true,
      wioaReviewedAt: true,
      updatedAt: true,
    },
  });

  const enriched = rows
    .map((r) => {
      const snap = parseWioaQualificationSnapshot(r.wioaQualificationJson);
      const submittedAt = snap?.submittedAt ? new Date(snap.submittedAt).getTime() : 0;
      return {
        ...r,
        snap,
        submittedAt,
        signal: snap?.signal ?? '—',
      };
    })
    .sort((a, b) => b.submittedAt - a.submittedAt);

  return (
    <PortalPageFrame>
      <PageHeader
        title="WIOA screening queue"
        subtitle="Members who completed the portal self-screening. Review status is for internal workflow only."
        action={
          <Link href="/admin/members" className="btn btn-outline">
            ← All members
          </Link>
        }
      />

      {enriched.length === 0 ? (
        <p style={{ color: 'var(--color-on-surface-variant)' }}>No self-screenings submitted yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--outline-variant)' }}>
                <th style={{ padding: '0.5rem' }}>Member</th>
                <th style={{ padding: '0.5rem' }}>Submitted</th>
                <th style={{ padding: '0.5rem' }}>Signal</th>
                <th style={{ padding: '0.5rem' }}>Review</th>
                <th style={{ padding: '0.5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <strong>{r.fullName}</strong>
                    <br />
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{r.email}</span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {r.snap ? new Date(r.snap.submittedAt).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '0.5rem' }}>{r.signal}</td>
                  <td style={{ padding: '0.5rem' }}>{wioaReviewLabel(r.wioaReviewStatus)}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <Link href={`/admin/members/${r.id}`} className="btn btn-outline btn-sm">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalPageFrame>
  );
}
