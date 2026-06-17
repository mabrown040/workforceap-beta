import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";
import { z } from 'zod';
import { captureApiError } from '@/lib/observability/captureApiError';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 3).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * The pre-write `user.findUnique` lookup goes through `withTenantScope`
 * so an Org A admin cannot create a CounselorNote attached to an Org B
 * member. `CounselorNote` itself is NOT in `TENANT_SCOPED_MODELS` — it
 * inherits its tenant via the `memberId` FK to `User` — so the note
 * reads/writes themselves stay on the raw client. The membership check
 * is the gate.
 */

const noteSchema = z.object({
  content: z.string().min(1).max(5000),
});async function _GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const orgId = await getActorOrganizationId(user.id);

    // Tenant gate: confirm the target member belongs to the active org
    // before exposing any of their notes.
    const member = await withTenantScope(orgId, (db) =>
      db.user.findFirst({ where: { id }, select: { id: true } }),
    );
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const notes = await prisma.$transaction((tx) => tx.counselorNote.findMany({
      where: { memberId: id },
      take: 500,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { fullName: true, email: true } } },
    }));
    return NextResponse.json(notes);
  } catch (error) {
    captureApiError(error, { route: 'admin/members/[id]/notes GET' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Note content required' }, { status: 400 });

    const orgId = await getActorOrganizationId(user.id);
    const member = await withTenantScope(orgId, (db) =>
      db.user.findFirst({ where: { id }, select: { id: true } }),
    );
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const note = await prisma.$transaction((tx) => tx.counselorNote.create({
      data: { memberId: id, authorId: user.id, content: parsed.data.content },
      include: { author: { select: { fullName: true, email: true } } },
    }));
    await auditLog({
      actorUserId: user.id,
      action: 'member_note_create',
      targetType: 'counselor_note',
      targetId: note.id,
      metadata: { memberId: id, contentLength: parsed.data.content.length },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: 'admin/members/[id]/notes POST' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
