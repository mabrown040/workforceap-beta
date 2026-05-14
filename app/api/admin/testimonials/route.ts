import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { TestimonialStatus } from '@prisma/client';

/**
 * GET /api/admin/testimonials
 * Admin/counselor API: list testimonials with filtering by status.
 * Query params: ?status=pending|approved|rejected|published&limit=50&offset=0
 *
 * Scoped to the caller's organization via the `member.organizationId` link.
 * Without scoping, a tenant admin or counselor would see every tenant's
 * testimonials plus member emails — cross-tenant PII exposure.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (!(await isAdmin(user.id)) && !(await isCounselor(user.id)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = await getActorOrganizationId(user.id);

    const { searchParams } = new URL(req.url);
    const statusRaw = searchParams.get('status') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    const statusFilter =
      statusRaw && Object.values(TestimonialStatus).includes(statusRaw as TestimonialStatus)
        ? (statusRaw as TestimonialStatus)
        : undefined;

    // Tenant scope: only testimonials whose member belongs to the caller's
    // organization. Same `member: { organizationId }` relation filter applies
    // to the listing, the listing's total count, and the headline stats so
    // every number on the page is honestly scoped.
    const orgScope = { member: { organizationId: orgId } };

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
}
