import Link from 'next/link';
import { Sparkles, UserPlus, Users } from 'lucide-react';
import PageHeader from '@/components/portal/PageHeader';
import { prisma } from '@/lib/db/prisma';

/**
 * Shared body for the In-office sessions index page. Used by both
 * /counselor/sessions and /admin/sessions so the admin clicking
 * "In-office sessions" stays inside admin chrome (per user direction
 * 2026-04-26: "if opened from admin, should stay in admin, not
 * counselor"). The two callers pass `actor` to control breadcrumbs +
 * outbound links; the data-fetching logic lives here once.
 */
type Actor = 'counselor' | 'admin';

const ACTOR_PATHS: Record<Actor, {
  base: string;
  walkInHref: string;
  pickMemberHref: string;
  runHrefFor: (memberId: string) => string;
  rootCrumb: { label: string; href: string };
}> = {
  counselor: {
    base: '/counselor/sessions',
    walkInHref: '/counselor/sessions/walk-in',
    pickMemberHref: '/counselor/students',
    runHrefFor: (memberId) => `/counselor/sessions/${memberId}/run`,
    rootCrumb: { label: 'Counselor', href: '/counselor' },
  },
  admin: {
    base: '/admin/sessions',
    walkInHref: '/admin/sessions/walk-in',
    pickMemberHref: '/admin/members',
    runHrefFor: (memberId) => `/admin/sessions/${memberId}/run`,
    rootCrumb: { label: 'Admin', href: '/admin' },
  },
};

export default async function SessionsIndexBody({
  actor,
  actorUserId,
}: {
  actor: Actor;
  actorUserId: string;
}) {
  const paths = ACTOR_PATHS[actor];

  const recent = await prisma.memberEvent.findMany({
    where: {
      eventName: 'ai_tool_run_completed',
      sessionId: { not: null },
      metadata: {
        path: ['actorUserId'],
        equals: actorUserId,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      userId: true,
      sessionId: true,
      createdAt: true,
      metadata: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  type SessionGroup = {
    sessionId: string;
    memberId: string;
    memberName: string;
    memberEmail: string;
    startedAt: Date;
    toolCount: number;
  };
  const grouped = new Map<string, SessionGroup>();
  for (const ev of recent) {
    if (!ev.sessionId) continue;
    const existing = grouped.get(ev.sessionId);
    if (existing) {
      existing.toolCount += 1;
      if (ev.createdAt < existing.startedAt) existing.startedAt = ev.createdAt;
    } else {
      grouped.set(ev.sessionId, {
        sessionId: ev.sessionId,
        memberId: ev.userId,
        memberName: ev.user.fullName ?? ev.user.email,
        memberEmail: ev.user.email,
        startedAt: ev.createdAt,
        toolCount: 1,
      });
    }
  }
  const sessions = [...grouped.values()].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()).slice(0, 12);

  return (
    <>
      <PageHeader
        title="In-office sessions"
        subtitle="Sit with a member for 30 minutes. Walk out with a polished resume, tailored cover letter, and interview prep — emailed to them automatically."
        breadcrumbs={[paths.rootCrumb, { label: 'In-office sessions' }]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Link
          href={paths.walkInHref}
          className="portal-card portal-card--flat"
          style={{ display: 'block', padding: '1.5rem', textDecoration: 'none', color: 'inherit', border: '2px solid var(--color-accent)', boxShadow: '0 8px 24px rgba(173,44,77,0.12)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ background: 'rgba(173,44,77,0.12)', color: 'var(--color-accent)', borderRadius: 'var(--radius-md)', padding: '0.5rem', display: 'inline-flex' }}>
              <UserPlus size={22} />
            </span>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Walk-in</h2>
          </div>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)', margin: 0 }}>
            Someone new sat down. Create their account, build their profile, and ship them resume + cover letter + interview prep in one session.
          </p>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent)' }}>
            Start walk-in &rarr;
          </div>
        </Link>

        <Link
          href={paths.pickMemberHref}
          className="portal-card portal-card--flat"
          style={{ display: 'block', padding: '1.5rem', textDecoration: 'none', color: 'inherit', border: '1px solid var(--outline-variant)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ background: 'rgba(43,123,185,0.12)', color: 'var(--color-blue, #2b7bb9)', borderRadius: 'var(--radius-md)', padding: '0.5rem', display: 'inline-flex' }}>
              <Users size={22} />
            </span>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Existing member</h2>
          </div>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)', margin: 0 }}>
            Pick someone from your roster. Update their profile, then run the same 4-step build &mdash; outputs save to their portal and email.
          </p>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-blue, #2b7bb9)' }}>
            Pick a member &rarr;
          </div>
        </Link>
      </div>

      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-on-surface)' }}>
        Your recent sessions
      </h2>
      {sessions.length === 0 ? (
        <div className="portal-card portal-card--flat" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
          <Sparkles size={28} style={{ margin: '0 auto 0.75rem', display: 'block', color: 'var(--color-accent)' }} />
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-on-surface)' }}>No sessions yet</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
            Start your first walk-in or existing-member session above.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sessions.map((s) => (
            <li key={s.sessionId} className="portal-card portal-card--flat" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.memberName}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                  {s.toolCount} tool run{s.toolCount === 1 ? '' : 's'} &middot; {s.startedAt.toLocaleString()}
                </div>
              </div>
              <Link
                href={`${paths.runHrefFor(s.memberId)}?sid=${s.sessionId}`}
                style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                Resume &rarr;
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
