import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';

async function _GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { await requireAdmin(user.id); } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const template = await prisma.$transaction((tx) => tx.emailTemplate.findUnique({ where: { id } }));
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(template);
  } catch (error) {
    console.error('/admin/email-templates/[id] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);

async function _PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { await requireAdmin(user.id); } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.$transaction((tx) => tx.emailTemplate.findUnique({ where: { id } }));
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.subject !== undefined) update.subject = String(body.subject).trim();
    if (body.body !== undefined) update.body = String(body.body).trim();
    if (body.variables !== undefined) {
      if (!Array.isArray(body.variables)) {
        return NextResponse.json({ error: 'variables must be an array' }, { status: 400 });
      }
      update.variables = body.variables.map((v: unknown) => String(v).trim()).filter(Boolean);
    }
    if (body.active !== undefined) update.active = !!body.active;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const template = await prisma.$transaction((tx) => tx.emailTemplate.update({
      where: { id },
      data: update,
    }));

    void auditLog({ actorUserId: user.id, action: 'admin_email_template_update', targetType: 'emailTemplate', targetId: id, metadata: { ...update, key: existing.key } }).catch(() => {});

    return NextResponse.json(template);
  } catch (error) {
    console.error('/admin/email-templates/[id] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);
