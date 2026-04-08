import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { parseWioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';
import { wioaReviewLabel, WIOA_REVIEW_STATUSES } from '@/lib/wioa/wioaReview';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PortalRouteFallback from '@/components/portal/PortalRouteFallback';
import WioaReviewFilterBar from '@/components/admin/WioaReviewFilterBar';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – WIOA screening queue',
  description: 'Members who submitted the WIOA self-screening questionnaire.',
  path: '/admin/wioa-screening',
});

type PageProps = {
  searchParams?: Promise<{ review?: string | string[] }>;
};

type WioaQueueRow = {
  id: string;
  fullName: string;
  email: string;
  wioaQualificationJson: Prisma.JsonValue;
  wioaReviewStatus: string | null;
  wioaReviewedAt: Date | null;
  updatedAt: Date;
};

function normalizeReviewParam(raw: string | string[] | undefined): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || typeof v !== 'string') return null;
  return (WIOA_REVIEW_STATUSES as readonly string[]).includes(v) ? v : null;
}

export default async function AdminWioaScreeningQueuePage({ searchParams }: PageProps) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/wioa-screening');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const sp = (await searchParams) ?? {};
  const reviewFilter = normalizeReviewParam(sp.review);

  let rows: WioaQueueRow[] = [];
  try {
    rows = await prisma.user.findMany({
      where: {
        deletedAt: null,
        wioaQualificationJson: { not: Prisma.DbNull },
        ...(reviewFilter ? { wioaReviewStatus: reviewFilter } : {}),
      },
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
  } catch (error) {
    console.error('[admin/wioa-screening] failed to load queue', error);
    const message = error instanceof Error ? error.message : String(error ?? '');
    const looksLikeSchemaDrift =
      (error instanceof Prisma.PrismaClientKnownRequestError ||
        error instanceof Prisma.PrismaClientUnknownRequestError) &&
      /wioa_qualification_json|wioa_review_status|wioa_reviewed_at/i.test(message);

    if (looksLikeSchemaDrift) {
      return (
        <PortalRouteFallback
          title="WIOA screening queue is temporarily unavailable"
          description="The WIOA review data could not be loaded right now. Other admin views are still available while we reconnect this queue."
        />
      );
    }
    throw error;
  }

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

      <WioaReviewFilterBar active={reviewFilter} />

      {enriched.length === 0 ? (
        <p style={{ color: 'var(--color-on-surface-variant)' }}>
          {reviewFilter ? 'No rows match this filter.' : 'No self-screenings submitted yet.'}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table admin-table--sticky-first" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--outline-variant)' }}>
                <th style={{ padding: '0.5rem', position: 'sticky', left: 0, background: 'var(--surface-container, #1e2022)', zIndex: 1 }}>
                  Member
                </th>
                <th style={{ padding: '0.5rem' }}>Submitted</th>
                <th style={{ padding: '0.5rem' }}>Signal</th>
                <th style={{ padding: '0.5rem' }}>Review</th>
                <th style={{ padding: '0.5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                  <td style={{ padding: '0.5rem', position: 'sticky', left: 0, background: 'var(--surface-container-low, #1a1c1e)', zIndex: 1 }}>
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
