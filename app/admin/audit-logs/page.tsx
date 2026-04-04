import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import AuditLogsClient from './AuditLogsClient';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Audit Logs',
  description: 'Compliance registry and system event audit trail.',
  path: '/admin/audit-logs',
});

export default async function AdminAuditLogsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/audit-logs');

  const superAdmin = await isSuperAdmin(user.id);
  if (!superAdmin) redirect('/admin');

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const events = await prisma.memberEvent.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  const stats = {
    total7d: events.length,
    uniqueUsers: new Set(events.map((e) => e.userId)).size,
    topEvent: (() => {
      const counts: Record<string, number> = {};
      for (const e of events) counts[e.eventName] = (counts[e.eventName] || 0) + 1;
      return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—';
    })(),
  };

  const serialized = events.map((e) => ({
    id: e.id,
    userId: e.userId,
    userName: e.user.fullName,
    userEmail: e.user.email,
    eventName: e.eventName,
    entityType: e.entityType,
    entityId: e.entityId,
    metadata: e.metadata as Record<string, unknown> | null,
    sourcePage: e.sourcePage,
    sessionId: e.sessionId,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="Compliance registry — 7-day event trail"
      />

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {[
          { label: 'Events (7d)', value: stats.total7d.toLocaleString(), icon: 'timeline', color: 'var(--color-accent)' },
          { label: 'Active Users', value: stats.uniqueUsers.toString(), icon: 'group', color: 'var(--color-blue)' },
          { label: 'Top Event', value: stats.topEvent, icon: 'trending_up', color: 'var(--color-green)' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: 'var(--surface-container)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '1.5rem', color: s.color, fontVariationSettings: "'FILL' 1" }}
            >
              {s.icon}
            </span>
            <div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>{s.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <AuditLogsClient events={serialized} />
    </>
  );
}
