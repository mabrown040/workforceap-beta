import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { captureApiError } from '@/lib/observability/captureApiError';
import { DesignSurface } from '@/components/portal/kit';
import SessionsIndexBody from '@/components/portal/sessions/SessionsIndexBody';
import {
  SessionsKit,
  type SessionKitRow,
} from '@/components/portal/kit/pages/admin-subviews/SessionsKit';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'In-office sessions',
  description: 'Run a guided 30-minute session with a member. Build profile, resume, cover letter, and interview prep together.',
  path: '/admin/sessions',
});
}

/** Cap the lean board so first paint stays cheap. */
const BOARD_LIMIT = 50;
/** Raw-event pull margin: multiple events collapse into one session row. */
const EVENT_TAKE = BOARD_LIMIT * 6;
/** Sessions touched within this window are still "in session". */
const LIVE_WINDOW_MS = 30 * 60 * 1000;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "Now" / "2h ago" / "3d ago" / locale date — relative when label. */
function whenLabel(d: Date): string {
  const diff = Date.now() - d.getTime();
  if (diff < LIVE_WINDOW_MS) return 'Now';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

/**
 * In-office sessions — admin view.
 *
 * DEFAULT: design-kit dense roster wired to real (lean) session data.
 * ?ui=legacy: the proven SessionsIndexBody workspace (walk-in / pick-member
 * cards + searchable history), unchanged. Per user direction 2026-04-26 this
 * view stays inside admin chrome (not counselor).
 */
export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ ui?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/sessions');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const { ui } = await searchParams;

  if (ui === 'legacy') {
    return <SessionsIndexBody actor="admin" actorUserId={user.id} />;
  }

  return renderKit();
}

/** Design-kit default: dense roster of recent sessions → <SessionsKit/>. */
async function renderKit() {
  // Pull recent completed-tool-run events across every counselor/admin, then
  // collapse to one row per session in JS (mirrors SessionsIndexBody). Lean:
  // single findMany with take + a parallel count; no transactions/HTTP.
  const where = {
    eventName: 'ai_tool_run_completed',
    sessionId: { not: null },
  } as const;

  const [eventsResult, sessionCountResult] = await Promise.allSettled([
    prisma.memberEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: EVENT_TAKE,
      select: {
        id: true,
        userId: true,
        sessionId: true,
        createdAt: true,
        metadata: true,
        user: { select: { id: true, fullName: true, email: true } },
      },
    }),
    // Distinct sessions in scope (best-effort; degrades to shown count).
    prisma.memberEvent.findMany({
      where,
      distinct: ['sessionId'],
      select: { sessionId: true },
    }),
  ]);

  // If the core query fails, fall back to the proven legacy workspace rather
  // than rendering a fabricated/empty kit.
  if (eventsResult.status === 'rejected') {
    captureApiError(eventsResult.reason, { route: 'admin/sessions', extra: { view: 'kit' } });
    redirect('/admin/sessions?ui=legacy');
  }

  type Group = {
    sessionId: string;
    memberId: string;
    memberName: string;
    memberEmail: string;
    counselor: string | null;
    startedAt: Date;
    lastAt: Date;
    toolCount: number;
  };
  const grouped = new Map<string, Group>();
  for (const ev of eventsResult.value) {
    if (!ev.sessionId) continue;
    const meta = (ev.metadata ?? {}) as { actorName?: string };
    const actorName = meta.actorName ?? null;
    const existing = grouped.get(ev.sessionId);
    if (existing) {
      existing.toolCount += 1;
      if (ev.createdAt < existing.startedAt) existing.startedAt = ev.createdAt;
      if (ev.createdAt > existing.lastAt) existing.lastAt = ev.createdAt;
      if (!existing.counselor && actorName) existing.counselor = actorName;
    } else {
      grouped.set(ev.sessionId, {
        sessionId: ev.sessionId,
        memberId: ev.userId,
        memberName: ev.user.fullName ?? ev.user.email,
        memberEmail: ev.user.email,
        counselor: actorName,
        startedAt: ev.createdAt,
        lastAt: ev.createdAt,
        toolCount: 1,
      });
    }
  }

  const rows: SessionKitRow[] = [...grouped.values()]
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
    .slice(0, BOARD_LIMIT)
    .map((s) => {
      const live = Date.now() - s.lastAt.getTime() < LIVE_WINDOW_MS;
      return {
        id: s.sessionId,
        member: s.memberName,
        memberEmail: s.memberEmail,
        initials: initialsFor(s.memberName),
        counselor: s.counselor ?? 'Unassigned',
        type: `Session · ${s.toolCount} tool${s.toolCount === 1 ? '' : 's'}`,
        when: whenLabel(s.lastAt),
        status: live ? 'In session' : 'Completed',
        href: `/admin/sessions/${s.memberId}/run?sid=${s.sessionId}`,
      };
    });

  const total =
    sessionCountResult.status === 'fulfilled'
      ? sessionCountResult.value.length
      : rows.length;

  return (
    <DesignSurface surface="dense">
      <SessionsKit sessions={rows} total={total} />
    </DesignSurface>
  );
}
