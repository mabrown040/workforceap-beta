import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { prisma } from '@/lib/db/prisma';
import { dataToCsv, csvDownloadResponse, exportFilename } from '@/lib/csv/export';
import { z } from 'zod';
import { buildFeedbackUserScope } from '../_feedbackScope';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { getActorOrganizationId } from '@/lib/tenant/organization';

const querySchema = z.object({
  type: z.enum(['training', 'counselor', 'platform', 'program', 'general']).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

async function _GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      await requireAdmin(user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userScope = await buildFeedbackUserScope(user.id);

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      type: searchParams.get('type') ?? undefined,
      rating: searchParams.get('rating') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { type, rating, from, to } = parsed.data;

    const where = {
      ...(type && { type }),
      ...(rating && { rating }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
      ...(userScope ? { user: userScope } : {}),
    };

    const items =
      userScope === null
        ? []
        : await prisma.memberFeedback.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { fullName: true, email: true } },
            },
          });

    const csv = dataToCsv(
      [
        { key: 'id', header: 'ID', accessor: (r) => r.id },
        { key: 'memberName', header: 'Member Name', accessor: (r) => r.user.fullName },
        { key: 'memberEmail', header: 'Member Email', accessor: (r) => r.user.email },
        { key: 'type', header: 'Type', accessor: (r) => r.type },
        { key: 'rating', header: 'Rating', accessor: (r) => r.rating },
        { key: 'comment', header: 'Comment', accessor: (r) => r.comment ?? '' },
        { key: 'createdAt', header: 'Submitted', accessor: (r) => r.createdAt },
      ],
      items,
      { reportTitle: 'Member Feedback Export', notes: 'Workforce Advancement Project' },
    );

    const orgId = await getActorOrganizationId(user.id).catch(() => null);
    auditLog({
      actorUserId: user.id,
      action: 'admin.export.feedback',
      targetType: 'MemberFeedbackExport',
      metadata: { orgId, rowCount: items.length, filters: { type, rating, from, to } },
    }).catch((err) => console.error('[admin/feedback/export] audit log failed:', err));
    logAuditEvent({
      user: { id: user.id, role: 'admin' },
      verb: 'exported',
      object: { type: 'MemberFeedbackExport', id: 'aggregate' },
      result: { success: true, extensions: { orgId, rowCount: items.length } },
      request: auditRequestMeta(request),
      orgId: orgId ?? undefined,
    }).catch((err) => console.error('[admin/feedback/export] xAPI audit log failed:', err));

    return csvDownloadResponse(csv, exportFilename('feedback'));
  } catch (error) {
    console.error('[admin/feedback/export] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
