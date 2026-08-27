import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Send } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { resolveAdminPageTenant } from '@/lib/tenant/adminPageScope';
import type { Prisma } from '@prisma/client';
import {
  InvitesKit,
  type InviteRow,
} from '@/components/portal/kit/pages/admin-subviews/InvitesKit';
import InvitesLegacyClient from './InvitesLegacyClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Invites',
    description: 'Bulk member & partner invitations — WorkforceAP admin.',
    path: '/admin/invites',
  });
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  partner: 'Partner',
  member: 'Member',
  counselor: 'Counselor',
};

/** Relative "Nd ago" / "Nh ago" caption matching the mockup ("2d ago"). */
function relativeSent(from: Date, now: Date): string {
  const ms = now.getTime() - from.getTime();
  if (ms < 0) return 'just now';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Pending invites past their expiresAt are effectively expired even if the row
// still reads status='pending' in the DB. The legacy table + stat cards already
// apply this rule, so the kit must agree to keep the counts consistent.
function effectiveStatus(
  status: string,
  expiresAt: Date,
  now: Date,
): InviteRow['status'] {
  if (status === 'pending' && expiresAt <= now) return 'expired';
  if (status === 'pending' || status === 'accepted' || status === 'expired' || status === 'revoked') {
    return status;
  }
  return 'pending';
}

export default async function AdminInvitesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/invites');
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  const params = (await searchParams) ?? {};
  const requestedUi = typeof params.ui === 'string' ? params.ui : null;

  // Legacy → the original client form + filterable/resend/revoke table.
  if (requestedUi === 'legacy') {
    return <InvitesLegacyClient />;
  }

  // --- DEFAULT: real (lean) invites cockpit (design kit) ---

  // Tenant scope: super-admins see all invites (platform ops); tenant admins
  // see only invites issued by users in their org (mirrors /api/admin/invites).
  const where: Prisma.InvitationWhereInput = {};
  if (!scope.superAdmin) {
    where.invitedBy = { organizationId: scope.orgId };
  }

  const now = new Date();

  // Lean parallel reads: count by status (KPI) + recent rows (table) + the
  // pending-but-past-expiry count, which the KPI has to subtract out (below).
  const [byStatusResult, rowsResult, expiredPendingResult] = await Promise.allSettled([
    prisma.invitation.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
    prisma.invitation.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
    prisma.invitation.count({
      where: { ...where, status: 'pending', expiresAt: { lte: now } },
    }),
  ]);

  if (rowsResult.status === 'rejected') {
    console.error('[admin/invites] rows load failed', rowsResult.reason);
    redirect('/admin/invites?ui=legacy');
  }

  const records = rowsResult.value;

  // KPI counts from the lean groupBy, keyed on the raw DB status.
  const counts: Record<string, number> = {
    pending: 0,
    accepted: 0,
    expired: 0,
    revoked: 0,
  };
  if (byStatusResult.status === 'fulfilled') {
    for (const g of byStatusResult.value) {
      counts[g.status] = (counts[g.status] ?? 0) + g._count._all;
    }
  } else {
    console.error('[admin/invites] status aggregate failed', byStatusResult.reason);
  }

  const sent = counts.pending + counts.accepted + counts.expired + counts.revoked;
  const accepted = counts.accepted;

  // The table renders a pending invite past its expiresAt as "Expired"
  // (effectiveStatus below), so the KPI has to apply the same rule or the stat
  // card contradicts the Status column sitting right beneath it. A failed count
  // falls back to the raw DB total rather than silently under-reporting.
  const expiredPending =
    expiredPendingResult.status === 'fulfilled' ? expiredPendingResult.value : 0;
  if (expiredPendingResult.status === 'rejected') {
    console.error('[admin/invites] expired-pending count failed', expiredPendingResult.reason);
  }
  const pending = Math.max(0, counts.pending - expiredPending);
  const rate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;

  const invites: InviteRow[] = records.map((inv) => ({
    id: inv.id,
    email: inv.email,
    type: ROLE_LABELS[inv.role] ?? inv.role,
    sent: relativeSent(inv.createdAt, now),
    status: effectiveStatus(inv.status, inv.expiresAt, now),
  }));

  const action = (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      {/* Manage = the legacy table with per-row resend/revoke controls, which the
          read-only kit table doesn't carry. Keep them reachable. */}
      <Link
        href="/admin/invites?ui=legacy"
        className="btn btn-outline"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      >
        Manage
      </Link>
      <Link
        href="/admin/invites/new"
        className="btn btn-primary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <Send size={16} />
        Send Invites
      </Link>
    </div>
  );

  return (
    <InvitesKit
      invites={invites}
      sent={sent}
      accepted={accepted}
      pending={pending}
      rate={rate}
      action={action}
      emptyAction={
        <Link href="/admin/invites/new" className="btn btn-primary">
          Send your first invite
        </Link>
      }
    />
  );
}
