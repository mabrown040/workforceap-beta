import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getTriageDigest, type TriageDigest } from '@/lib/admin/triageDigest';
import TriageDigestSection from '@/components/admin/TriageDigestSection';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Today',
    description: 'Who needs you today, plus the day-to-day actions you reach for most.',
    path: '/admin',
  });
}

/**
 * Today screen — the admin home for a non-technical workforce-development
 * operator. Surfaces ONLY the "who needs you today" triage, today's in-office
 * session count, and three big primary actions. Everything else (metric
 * cards, alerts, recent tables, super-admin views, quick links) lives one
 * click away at /admin/overview.
 */
export default async function AdminTodayPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  // "Today" is the operator's local day. Server runs in UTC; using UTC day
  // start is good enough for a count at-a-glance and avoids a tz dependency.
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [triageDigest, sessionsTodayRows] = await Promise.all([
    getTriageDigest().catch((reason): TriageDigest => {
      const msg = reason instanceof Error ? reason.message : String(reason);
      console.error('[admin/page] triageDigest failed', msg);
      return { buckets: [], allClear: true };
    }),
    prisma.memberEvent
      .findMany({
        where: {
          eventName: 'ai_tool_run_completed',
          sessionId: { not: null },
          createdAt: { gte: startOfToday },
        },
        select: { sessionId: true },
      })
      .catch((reason) => {
        const msg = reason instanceof Error ? reason.message : String(reason);
        console.error('[admin/page] sessionsToday failed', msg);
        return [] as Array<{ sessionId: string | null }>;
      }),
  ]);

  const sessionsToday = new Set(
    sessionsTodayRows.map((row) => row.sessionId).filter((id): id is string => Boolean(id))
  ).size;

  const primaryActions: Array<{ label: string; href: string; icon: string }> = [
    { label: 'Review applications', href: '/admin/pipeline', icon: 'fact_check' },
    { label: 'Message a student', href: '/admin/messages', icon: 'mark_email_unread' },
    { label: 'Add a student', href: '/admin/members/new', icon: 'person_add' },
  ];

  return (
    <PortalPageFrame>
      <PageHeader
        title="Today"
        subtitle="The people who need you, plus the things you do every day."
        action={
          <Link
            href="/admin/overview"
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--color-on-surface-variant)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            See full overview &rarr;
          </Link>
        }
      />

      {/* "Who needs you today" — the only surface dad needs at the top. */}
      <TriageDigestSection digest={triageDigest} />

      {/* Today's in-office session count — one line, links to history. */}
      <section style={{ padding: '0 1.5rem', marginBottom: '1.5rem' }}>
        <Link
          href="/admin/sessions"
          className="portal-card portal-card--flat"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.95rem',
              color: 'var(--color-on-surface)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: 'var(--color-accent)' }}
              aria-hidden
            >
              event_available
            </span>
            <span>
              <strong>{sessionsToday}</strong>{' '}
              {sessionsToday === 1 ? 'in-office session' : 'in-office sessions'} today
            </span>
          </span>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--color-accent)',
            }}
          >
            View sessions &rarr;
          </span>
        </Link>
      </section>

      {/* Three big primary actions. Dad-sized targets. */}
      <section style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {primaryActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="btn btn-primary"
              style={{
                justifyContent: 'center',
                gap: '0.6rem',
                padding: '1.1rem 1.25rem',
                fontSize: '1rem',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.2rem' }}
                aria-hidden
              >
                {action.icon}
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </PortalPageFrame>
  );
}
