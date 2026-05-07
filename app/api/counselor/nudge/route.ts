import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import {
  getOrCreateMemberCounselorThread,
  assertStaffCanPost,
  normalizeMessageBody,
  serializeMessage,
} from '@/lib/messages/counselorThread';
import {
  getTemplate,
  renderNudge,
  type NudgeTemplateId,
} from '@/lib/counselor/nudgeTemplates';
import { getProgramBySlug } from '@/lib/content/programs';

const VALID_TEMPLATE_IDS: NudgeTemplateId[] = ['check_in', 'stalled_step', 'milestone_celebrate'];

/**
 * POST /api/counselor/nudge
 *
 * Send a templated nudge from a counselor to one assigned member. Creates a
 * Message in the member's counselor thread (creating the thread if one
 * doesn't exist yet) and writes a `counselor_nudge_sent` MemberEvent so the
 * triage queue picks up the change immediately and outcomes can later
 * attribute retention to nudge cadence.
 *
 * Body:
 *   {
 *     memberId: string,
 *     templateId: 'check_in' | 'stalled_step' | 'milestone_celebrate',
 *     overrideBody?: string,   // counselor edited the rendered body before sending
 *     milestone?: string       // human-readable milestone for milestone_celebrate
 *   }
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const memberId = typeof body.memberId === 'string' ? body.memberId : '';
  const templateId = typeof body.templateId === 'string' ? (body.templateId as NudgeTemplateId) : null;
  const overrideBody = typeof body.overrideBody === 'string' ? body.overrideBody : null;
  const milestoneInput = typeof body.milestone === 'string' ? body.milestone : null;

  if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 });
  if (!templateId || !VALID_TEMPLATE_IDS.includes(templateId)) {
    return NextResponse.json({ error: 'valid templateId required' }, { status: 400 });
  }

  const template = getTemplate(templateId);
  if (!template) return NextResponse.json({ error: 'Unknown template' }, { status: 400 });

  // Ensure the member exists and the staff user is allowed to message them.
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { id: true, fullName: true, enrolledProgram: true, deletedAt: true },
  });
  if (!member || member.deletedAt) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Get or create the counselor thread so the staff-can-post check has
  // something to authorize against.
  const thread = await getOrCreateMemberCounselorThread(memberId);
  const allowed = await assertStaffCanPost(user.id, thread.id);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Compose the message body. If the counselor edited the rendered body in
  // the UI, prefer their edit but still validate length/emptiness.
  let composed: string;
  if (overrideBody !== null && overrideBody.trim() !== '') {
    composed = overrideBody;
  } else {
    const program = member.enrolledProgram ? getProgramBySlug(member.enrolledProgram) : null;
    const programLabel = program?.title ? `your ${program.title} track` : 'your training';
    composed = renderNudge(template, {
      firstName: member.fullName,
      programLabel,
      milestone: milestoneInput ?? undefined,
    });
  }

  const normalized = normalizeMessageBody(composed);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  // Send the message and write the audit event in a single transaction so a
  // partial failure doesn't leave the queue thinking a nudge happened when
  // the member never received it.
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        threadId: thread.id,
        authorId: user.id,
        body: normalized.body,
      },
      select: { id: true, threadId: true, authorId: true, body: true, createdAt: true },
    });

    await tx.memberEvent.create({
      data: {
        userId: memberId,
        eventName: 'counselor_nudge_sent',
        entityType: 'message',
        entityId: created.id,
        metadata: {
          templateId,
          counselorUserId: user.id,
          threadId: thread.id,
          edited: overrideBody !== null && overrideBody.trim() !== '',
        },
      },
    });

    return created;
  });

  return NextResponse.json({
    ok: true,
    message: serializeMessage(message),
    template: { id: template.id, label: template.label },
  });
}
