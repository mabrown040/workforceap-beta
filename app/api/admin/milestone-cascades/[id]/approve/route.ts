import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';

import {
  ActionDraftSchema,
  type ActionDraft,
} from '@/lib/milestoneCascade/types';
import { CascadeDispatchError, dispatchApprovedCascade } from '@/lib/milestoneCascade/sendApprovedCascade';
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
    const scopeWhere = await resolveCascadeUserFilter(user.id);
    const cascade = await prisma.$transaction(tx => tx.milestoneCascade.findFirst({
      where: { id, ...scopeWhere },
      include: { user: { select: { email: true, organizationId: true, deletedAt: true } } },
    }));
    if (!cascade || cascade.user.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!['awaiting_approval', 'approved', 'sent'].includes(cascade.status)) {
      return NextResponse.json(
        { error: `Cascade is in status "${cascade.status}", not available for approval or retry` },
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
    if (drafts.length === 0 || drafts.length !== rawDrafts.length || drafts.length > 5) {
      return NextResponse.json(
        { error: 'The saved drafts are invalid. Staff review is required before sending.' },
        { status: 422 },
      );
    }

    // Apply counselor edits (only to celebrate_milestone drafts; other types
    // are not editable in the pilot — the schema above rejects unknown
    // fields, and we only spread into matching type).
    const edited = parsed.data.editedDrafts ?? {};
    if (cascade.status !== 'awaiting_approval' && Object.keys(edited).length > 0) {
      return NextResponse.json({ error: 'Approved messages are frozen. Retry the saved failed drafts without editing them.', code: 'approved_drafts_frozen' }, { status: 409 });
    }
    const finalDrafts: ActionDraft[] = drafts.map((d, i) => {
      const e = edited[String(i)];
      if (!e || d.type !== 'celebrate_milestone') return d;
      return {
        ...d,
        ...(e.subject !== undefined ? { subject: e.subject } : {}),
        ...(e.body !== undefined ? { body: e.body } : {}),
      };
    });

    // The dispatcher atomically claims the saved snapshot and persists every
    // per-draft outcome. Retrying reuses its fixed provider keys and skips all
    // accepted messages; the route never guesses a rollback after a send.
    const dispatchResult = await dispatchApprovedCascade({
      cascadeId: id,
      drafts: finalDrafts,
      recipientEmail: cascade.user.email,
      approvedByUserId: user.id,
      sourceDrafts: cascade.drafts,
      scopeWhere,
    });

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
    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'approved', object: { type: 'MilestoneCascade', id }, result: { success: true, extensions: { targetUserId: cascade.userId, emailsSent: dispatchResult.emailsSent } } }).catch(() => {});

    if (dispatchResult.dispatch.failed === 0 && dispatchResult.dispatch.uncertain === 0 && dispatchResult.dispatch.pending === 0) trackEvent({
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

    if (dispatchResult.dispatch.failed || dispatchResult.dispatch.uncertain || dispatchResult.dispatch.pending) {
      return NextResponse.json({ ok: false, error: 'Some messages were not accepted. Retry only the saved failed drafts; accepted messages will be skipped.', code: 'dispatch_incomplete', retryable: dispatchResult.dispatch.canRetry, cascadeId: id, ...dispatchResult }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      cascadeId: id,
      ...dispatchResult,
    });
  } catch (err) {
    if (err instanceof CascadeDispatchError) return NextResponse.json({ ok: false, error: err.message, code: err.code, retryable: err.retryable }, { status: err.status });
    // The Prisma/dispatcher text stays in the server log; the client gets one
    // stable sentence.
    console.error('[milestone-cascade approve] unhandled:', err);
    return NextResponse.json(
      { error: 'Unable to approve this cascade. Please try again in a few minutes.' },
      { status: 500 },
    );
  }
}
export const POST = withApiGuc(_POST);
