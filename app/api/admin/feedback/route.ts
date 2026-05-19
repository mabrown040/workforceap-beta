import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getUser } from '@/lib/auth/server';
import { requireAdminOrCounselor, isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

import { withRouteObservability } from '@/lib/api/routeObservability';

/**
 * Build the per-actor scope filter on `memberFeedback.user`. Without scope
 * a counselor or non-super tenant admin who reached this endpoint
 * directly got every tenant's feedback rows with member names + emails,
 * even though the /admin/feedback page itself is admin-only. Scoping
 * here brings the API in line with the page and with sibling admin
 * routes.
 *
 * Returns:
 *   - `undefined` for super-admins (no scope filter)
 *   - `{ organizationId }` for tenant admins
 *   - `{ id: { in: assignedMemberIds } }` for non-admin counselors
 *   - `null` to deny (empty payload)
 */
async function buildFeedbackUserScope(staffUserId: string): Promise<
  Prisma.UserWhereInput | undefined | null
> {
  if (await isSuperAdmin(staffUserId)) return undefined;
  if (await isAdmin(staffUserId)) {
    try {
      return { organizationId: await getActorOrganizationId(staffUserId) };
    } catch {
      return null;
    }
  }
  const counselor = await prisma.counselor.findFirst({
    where: { userId: staffUserId, active: true },
    select: { id: true },
  });
  if (!counselor) return null;
  const assignments = await prisma.counselorAssignment.findMany({
    where: { counselorId: counselor.id, active: true },
    select: { memberId: true },
  });
  const ids = assignments.map((a) => a.memberId);
  if (ids.length === 0) return null;
  return { id: { in: ids } };
}

const querySchema = z.object({
  type: z.enum(['training', 'counselor', 'platform', 'program', 'general']).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  take: z.coerce.number().int().min(1).max(500).default(100),
  skip: z.coerce.number().int().min(0).default(0),
});export const GET = withRouteObservability(async (request: NextRequest) => {
  try {
    const auth = await requireAdminOrCounselor(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userScope = await buildFeedbackUserScope(auth.userId);
    if (userScope === null) {
      // Denied (counselor with no assignments / org lookup failed).
      // Return an empty payload rather than 403 so the page's loading UI
      // resolves cleanly.
      return NextResponse.json({ feedback: [], total: 0, take: 100, skip: 0 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      type: searchParams.get('type') ?? undefined,
      rating: searchParams.get('rating') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      take: searchParams.get('take') ?? undefined,
      skip: searchParams.get('skip') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { type, rating, from, to, take, skip } = parsed.data;

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

    const [items, total] = await Promise.all([
      prisma.memberFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.memberFeedback.count({ where }),
    ]);

    return NextResponse.json({
      feedback: items.map((f) => ({
        id: f.id,
        userId: f.userId,
        memberName: f.user.fullName,
        memberEmail: f.user.email,
        type: f.type,
        rating: f.rating,
        comment: f.comment,
        metadata: f.metadata,
        createdAt: f.createdAt.toISOString(),
      })),
      total,
      take,
      skip,
    });
  } catch (error) {
    console.error('/admin/feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
