import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';

import {
  ActionDraftSchema,
  type ActionDraft,
} from '@/lib/milestoneCascade/types';
import { dispatchApprovedCascade } from '@/lib/milestoneCascade/sendApprovedCascade';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Build a where-fragment that restricts a milestone_cascade lookup to the
 * staff user's tenant. Super-admins pass through with no filter; tenant
 * admins must own the cascade's member. Returns `{ id: '__deny__' }` (a
 * value that won't match any real row) on org-lookup failure so the caller
 * gets a clean 404.
 */
async function resolveCascadeUserFilter(staffUserId: string): Promise<object> {
  if (await isSuperAdmin(staffUserId)) return {};
  try {
    const orgId = await getActorOrganizationId(staffUserId);
    return { user: { organizationId: orgId } };
  } catch {
    return { id: '__deny__' };
  }
}

/**
 * Approve a cascade. Sends celebrate_milestone drafts via email and logs
 * the advisory drafts (suggest_next_course, request_peer_pair, etc.). The
 * approver can edit subject/body inline before approving — that's the
 * `editedDrafts` field, a sparse map keyed by draft index.
 *
 * Admin-only. Counselor access is a follow-up: it requires per-row
 * assignment scoping (counselor X must only be able to approve cascades
 * for members assigned to them via active counselor_assignment rows), and
 * the inbox query must filter to the same scope. Until that's wired,
 * letting any counselor approve any cascade would let counselor A act on
 * counselor B's learners by guessing/copying a cascade id. See
 * lib/counselor/staffMemberAccess.ts for the existing per-row helper
 * (`assertStaffCanAccessMemberRecord`) that the follow-up should call here.
 */

// Counselor can patch subject/body of a celebrate_milestone draft. Other
// fields and other action types are not editable in the pilot.
const editedDraftSchema = z.object({
  subject: z.string().min(1).max(120).optional(),
  body: z.string().min(1).max(4000).optional(),
});

const bodySchema = z.object({
  editedDrafts: z.record(z.string(), editedDraftSchema).optional(),
});

async function _POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Tenant scope: super-admin can act across orgs; everyone else can only
    // approve cascades whose member belongs to their organization. Without
    // this filter the global `isAdmin()` check above would let any tenant
    // admin who knows / guesses a cascade UUID send a milestone email to
    // another tenant's learner. 404 on cross-tenant ids to prevent
    // enumeration.
    const cascade = await prisma.milestoneCascade.findFirst({
      where: { id, ...(await resolveCascadeUserFilter(user.id)) },
      include: { user: { select: { email: true, organizationId: true } } },
    });
    if (!cascade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (cascade.status !== 'awaiting_approval') {
      return NextResponse.json(
        { error: `Cascade is in status "${cascade.status}", not awaiting_approval` },
        { status: 409 },
      );
    }

    // TTL guard. The expire cron runs daily, so there's a window of up to
    // 24h where a cascade is past its expiresAt but still
    // status='awaiting_approval'. Sending in that window would violate the
    // "stale celebrations are worse than no celebration" rule. The cron
    // toggle can also be flipped off independently, which would let stale
    // cascades sit indefinitely — defense in depth here means the route
    // refuses on its own.
    const now = new Date();
    if (cascade.expiresAt <= now) {
      return NextResponse.json(
        {
          error: 'Cascade has expired (past 72h TTL) — stale celebrations should not be sent',
          expiredAt: cascade.expiresAt,
          code: 'expired',
        },
        { status: 409 },
      );
    }

    // Validate the existing drafts (defense-in-depth — they were validated
    // on the way into the DB, but the column type is Json so we can't trust
    // it without re-validation).
    const rawDrafts = Array.isArray(cascade.drafts) ? cascade.drafts : [];
    const drafts: ActionDraft[] = [];
    for (const item of rawDrafts) {
      const r = ActionDraftSchema.safeParse(item);
      if (r.success) drafts.push(r.data);
    }
    if (drafts.length === 0) {
      return NextResponse.json(
        { error: 'No valid drafts on this cascade — nothing to send' },
        { status: 422 },
      );
    }

    // Apply counselor edits (only to celebrate_milestone drafts; other types
    // are not editable in the pilot — the schema above rejects unknown
    // fields, and we only spread into matching type).
    const edited = parsed.data.editedDrafts ?? {};
    const finalDrafts: ActionDraft[] = drafts.map((d, i) => {
      const e = edited[String(i)];
      if (!e || d.type !== 'celebrate_milestone') return d;
      return {
        ...d,
        ...(e.subject !== undefined ? { subject: e.subject } : {}),
        ...(e.body !== undefined ? { body: e.body } : {}),
      };
    });

    // Atomic transition: only flip if still awaiting_approval AND not yet
    // expired. The expiresAt filter closes the precheck→update race window
    // (counselor opens at 70h, takes 3h to edit, clicks approve at 73h —
    // we want this to fail rather than send a stale cascade). Persist the
    // edited drafts so the audit trail reflects what was actually sent.
    const updateResult = await prisma.milestoneCascade.updateMany({
      where: { id, status: 'awaiting_approval', expiresAt: { gt: now } },
      data: {
        status: 'approved',
        approvedByUserId: user.id,
        approvedAt: new Date(),
        drafts: finalDrafts as unknown as object,
      },
    });
    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Cascade was no longer awaiting_approval (lost race)' },
        { status: 409 },
      );
    }

    // Dispatch outbound (sends emails, transitions to `sent`).
    let dispatchResult: { emailsSent: number; emailsFailed: number; advisoryCount: number };
    try {
      dispatchResult = await dispatchApprovedCascade({
        cascadeId: id,
        drafts: finalDrafts,
        recipientEmail: cascade.user?.email ?? '',
      });
    } catch (dispatchErr) {
      console.error('[milestone-cascade approve] dispatch failed:', dispatchErr);
      // Transition to dispatch_failed so the cascade can be retried
      await prisma.milestoneCascade.updateMany({
        where: { id, status: 'approved' },
        data: {
          status: 'dispatch_failed',
        },
      });
      return NextResponse.json(
        {
          error: 'Approval saved but dispatch failed',
          detail: dispatchErr instanceof Error ? dispatchErr.message : 'unknown',
          code: 'dispatch_failed',
          retryable: true,
        },
        { status: 502 },
      );
    }

    // Audit trail.
    await auditLog({
      actorUserId: user.id,
      action: 'milestone_cascade.approve',
      targetType: 'MilestoneCascade',
      targetId: id,
      metadata: {
        targetUserId: cascade.userId,
        emailsSent: dispatchResult.emailsSent,
        emailsFailed: dispatchResult.emailsFailed,
        advisoryCount: dispatchResult.advisoryCount,
      },
    }).catch((err) => console.error('[milestone-cascade] auditLog failed:', err));

    trackEvent({
      userId: cascade.userId,
      eventName: 'milestone_cascade_sent',
      entityType: 'MilestoneCascade',
      entityId: id,
      metadata: {
        approvedBy: user.id,
        emailsSent: dispatchResult.emailsSent,
        emailsFailed: dispatchResult.emailsFailed,
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      cascadeId: id,
      ...dispatchResult,
    });
  } catch (err) {
    console.error('[milestone-cascade approve] unhandled:', err);
    return NextResponse.json(
      { error: 'Approve failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
export const POST = withApiGuc(_POST);
