import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { TestimonialStatus } from '@prisma/client';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * GET /api/admin/testimonials
 * Admin/counselor API: list testimonials with filtering by status.
 * Query params: ?status=pending|approved|rejected|published&limit=50&offset=0
 *
 * Scoped to the caller's organization via the `member.organizationId` link.
 * Super-admins bypass the scope so the platform-level queue surfaces
 * cross-tenant pending testimonials (matches the `[id]` handler).
 */
export const GET = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user || (!(await isAdmin(user.id)) && !(await isCounselor(user.id)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isSuper = await isSuperAdmin(user.id);
    const orgId = isSuper ? null : await getActorOrganizationId(user.id);
    if (!isSuper && !orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusRaw = searchParams.get('status') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    const statusFilter =
      statusRaw && Object.values(TestimonialStatus).includes(statusRaw as TestimonialStatus)
        ? (statusRaw as TestimonialStatus)
        : undefined;

    // Tenant scope: only testimonials whose member belongs to the caller's
    // organization. Super-admins skip the scope.
    const orgScope = isSuper ? {} : { member: { organizationId: orgId! } };

    const where = {
      deletedAt: null,
      ...orgScope,
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const [testimonials, total] = await Promise.all([
      prisma.testimonial.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              email: true,
              enrolledProgram: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      prisma.testimonial.count({ where }),
    ]);

    // Stats — same org scope as the listing.
    const [globalPending, globalApproved, globalRejected, globalPublished] = await Promise.all([
      prisma.testimonial.count({ where: { deletedAt: null, ...orgScope, status: TestimonialStatus.PENDING } }),
      prisma.testimonial.count({ where: { deletedAt: null, ...orgScope, status: TestimonialStatus.APPROVED } }),
      prisma.testimonial.count({ where: { deletedAt: null, ...orgScope, status: TestimonialStatus.REJECTED } }),
      prisma.testimonial.count({ where: { deletedAt: null, ...orgScope, status: TestimonialStatus.PUBLISHED } }),
    ]);

    return NextResponse.json({
      testimonials,
      total,
      offset,
      limit,
      stats: {
        pending: globalPending,
        approved: globalApproved,
        rejected: globalRejected,
        published: globalPublished,
      },
    });
  } catch (error) {
    console.error('[admin/testimonials] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
