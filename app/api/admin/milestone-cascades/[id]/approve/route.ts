import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { auditLog } from '@/lib/audit';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';

import {
  ActionDraftSchema,
  type ActionDraft,
} from '@/lib/milestoneCascade/types';
import { dispatchApprovedCascade } from '@/lib/milestoneCascade/sendApprovedCascade';

/**
 * Approve a cascade. Sends celebrate_milestone drafts via email and logs
 * the advisory drafts (suggest_next_course, request_peer_pair, etc.). The
 * counselor can edit subject/body inline before approving — that's the
 * `editedDrafts` field, a sparse map keyed by draft index.
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [adminOk, counselorOk] = await Promise.all([
      isAdmin(user.id),
      isCounselor(user.id),
    ]);
    if (!adminOk && !counselorOk) {
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

    const cascade = await prisma.milestoneCascade.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!cascade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (cascade.status !== 'awaiting_approval') {
      return NextResponse.json(
        { error: `Cascade is in status "${cascade.status}", not awaiting_approval` },
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

    // Atomic transition: only flip if still awaiting_approval. Persist the
    // edited drafts so the audit trail reflects what was actually sent.
    const updateResult = await prisma.milestoneCascade.updateMany({
      where: { id, status: 'awaiting_approval' },
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
    const dispatchResult = await dispatchApprovedCascade({
      cascadeId: id,
      drafts: finalDrafts,
      recipientEmail: cascade.user?.email ?? '',
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
