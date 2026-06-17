import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';
import { z } from 'zod';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const noteSchema = z.object({
  content: z.string().min(1).max(5000),
});

async function _GET(
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

    const notes = await prisma.$transaction((tx) => tx.advisorSessionNote.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { author: { select: { fullName: true, email: true } } },
    }));
    return NextResponse.json(notes);
  } catch (error) {
    console.error('/counselor/members/[memberId]/session-notes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);

async function _POST(
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

    const note = await prisma.$transaction((tx) => tx.advisorSessionNote.create({
      data: { memberId, authorId: user.id, content: parsed.data.content },
      include: { author: { select: { fullName: true, email: true } } },
    }));
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('/counselor/members/[memberId]/session-notes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);

async function _DELETE(
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

    const { noteId } = await request.json().catch(() => ({}));
    if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 });

    const note = await prisma.$transaction((tx) => tx.advisorSessionNote.findFirst({
      where: { id: noteId, memberId, authorId: user.id },
    }));
    if (!note) return NextResponse.json({ error: 'Note not found or not yours' }, { status: 404 });

    await prisma.$transaction((tx) => tx.advisorSessionNote.delete({ where: { id: noteId } }));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('/counselor/members/[memberId]/session-notes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);
