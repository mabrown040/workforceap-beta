import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';
import { z } from 'zod';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 3).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * The membership lookup (`user.findUnique`) goes through `withTenantScope`
 * so a counselor from Org A cannot create / read notes attached to an
 * Org B member, even if the counselor->member assignment check passed
 * for some reason. `CounselorNote` is NOT in `TENANT_SCOPED_MODELS` —
 * it inherits its tenant via `memberId` FK to `User` — so the note
 * reads/writes themselves stay on the raw client. The membership
 * lookup is the gate.
 */

const noteSchema = z.object({
  content: z.string().min(1).max(5000),
});async function _GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [admin, counselor] = await Promise.all([isAdmin(user.id), isCounselor(user.id)]);
  if (!admin && !counselor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  if (!(await assertStaffCanAccessMemberRecord(user.id, memberId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const notes = await prisma.$transaction((tx) => tx.counselorNote.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { author: { select: { fullName: true, email: true } } },
  }));
  // DELETE only accepts the author's own notes; tell the client up front so it
  // does not offer a delete control that can only 404.
  return NextResponse.json(notes.map((note) => ({ ...note, canDelete: note.authorId === user.id })));

  } catch (error) {
    console.error('/counselor/members/[memberId]/notes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [admin, counselor] = await Promise.all([isAdmin(user.id), isCounselor(user.id)]);
  if (!admin && !counselor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  if (!(await assertStaffCanAccessMemberRecord(user.id, memberId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Note content required' }, { status: 400 });

  const orgId = await getActorOrganizationId(user.id);
  const member = await withTenantScope(orgId, (db) =>
    db.user.findFirst({ where: { id: memberId }, select: { id: true } }),
  );
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const note = await prisma.$transaction((tx) => tx.counselorNote.create({
    data: { memberId, authorId: user.id, content: parsed.data.content },
    include: { author: { select: { fullName: true, email: true } } },
  }));

  auditLog({
    actorUserId: user.id,
    action: 'counselor_note_created',
    targetType: 'User',
    targetId: memberId,
    metadata: { noteId: note.id },
  }).catch(() => {});
  logAuditEvent({
    user: { id: user.id, role: 'counselor' },
    verb: 'created',
    object: { type: 'CounselorNote', id: note.id },
    result: { success: true },
  }).catch(() => {});

  return NextResponse.json({ ...note, canDelete: true }, { status: 201 });

  } catch (error) {
    console.error('/counselor/members/[memberId]/notes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);async function _DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [admin, counselor] = await Promise.all([isAdmin(user.id), isCounselor(user.id)]);
  if (!admin && !counselor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  if (!(await assertStaffCanAccessMemberRecord(user.id, memberId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const noteId = (raw && typeof raw === 'object' ? (raw as { noteId?: unknown }).noteId : undefined);
  if (typeof noteId !== 'string' || !noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 });

  const note = await prisma.$transaction((tx) => tx.counselorNote.findFirst({
    where: { id: noteId, memberId, authorId: user.id },
  }));
  if (!note) return NextResponse.json({ error: 'Note not found or not yours' }, { status: 404 });

  await prisma.$transaction((tx) => tx.counselorNote.delete({ where: { id: noteId } }));

  auditLog({
    actorUserId: user.id,
    action: 'counselor_note_deleted',
    targetType: 'User',
    targetId: memberId,
    metadata: { noteId },
  }).catch(() => {});
  logAuditEvent({
    user: { id: user.id, role: 'counselor' },
    verb: 'deleted',
    object: { type: 'CounselorNote', id: noteId },
    result: { success: true },
  }).catch(() => {});

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/counselor/members/[memberId]/notes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);

