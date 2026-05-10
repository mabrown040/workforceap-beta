import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import {
  getBoardSnapshot,
  formatBoardSnapshotMarkdown,
  type BoardOutcomesPeriod,
} from '@/lib/admin/boardOutcomes';

const VALID_PERIODS: BoardOutcomesPeriod[] = ['all-time', 'ytd', 'q-current', 'q-prev'];

/**
 * GET /api/admin/outcomes/snapshot?period=all-time|ytd|q-current|q-prev
 *
 * Single-page Markdown summary of every external-facing outcome metric.
 * This is the artifact Dad walks into TWC, AAUL, or a corporate co-funder
 * room with. Every number is timestamped and sourced from a documented
 * Prisma query (see docs/OUTCOMES-METHODOLOGY.md).
 *
 * Admin-only.
 */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const periodParam = req.nextUrl.searchParams.get('period');
  const period: BoardOutcomesPeriod =
    periodParam && (VALID_PERIODS as string[]).includes(periodParam)
      ? (periodParam as BoardOutcomesPeriod)
      : 'all-time';

  const orgId = await getActorOrganizationId(user.id);
  const superUser = await isSuperAdmin(user.id);

  try {
    const snapshot = await getBoardSnapshot(period, superUser ? undefined : orgId);
    const markdown = formatBoardSnapshotMarkdown(snapshot);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `wap-outcomes-snapshot-${period}-${date}.md`;

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[outcomes/snapshot] generation failed', err);
    return NextResponse.json({ error: 'Snapshot generation failed' }, { status: 500 });
  }
}
