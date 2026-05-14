import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { TestimonialStatus } from '@prisma/client';

/**
 * Build a where-clause that scopes a testimonial lookup to the caller's
 * tenant unless the caller is a super-admin (who can act across tenants).
 *
 * Returning null means "deny" — used when getActorOrganizationId fails.
 */
async function buildScopedWhere(
  testimonialId: string,
  staffUserId: string,
): Promise<{
  id: string;
  deletedAt: null;
  member?: { organizationId: string };
} | null> {
  const base: { id: string; deletedAt: null } = { id: testimonialId, deletedAt: null };
  if (await isSuperAdmin(staffUserId)) return base;
  try {
    const orgId = await getActorOrganizationId(staffUserId);
    return { ...base, member: { organizationId: orgId } };
  } catch {
    return null;
  }
}

/**
 * PATCH /api/admin/testimonials/[id]
 * Admin API: update testimonial status (approve/reject/publish), content, rating, etc.
 * Body: { status?, content?, rating?, rejectionReason?, photoUrl? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const scopedWhere = await buildScopedWhere(id, user.id);
    if (!scopedWhere) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // findFirst (not findUnique) because the where clause now includes a
    // relation filter (member.organizationId). Cross-tenant ids surface as
    // 404, intentionally — admins can't enumerate other tenants by trying
    // testimonial UUIDs.
    const existing = await prisma.testimonial.findFirst({ where: scopedWhere });
    if (!existing)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const {
      status,
      content,
      rating,
      rejectionReason,
      photoUrl,
    } = body as {
      status?: string;
      content?: string;
      rating?: number;
      rejectionReason?: string;
      photoUrl?: string;
    };

    const update: Record<string, unknown> = {};

    if (status !== undefined) {
      const validStatuses = Object.values(TestimonialStatus);
      if (!validStatuses.includes(status as TestimonialStatus)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      update.status = status as TestimonialStatus;
      // Set reviewer info when transitioning to a reviewed state
      if (
        status === TestimonialStatus.APPROVED ||
        status === TestimonialStatus.REJECTED ||
        status === TestimonialStatus.PUBLISHED
      ) {
        update.reviewedBy = user.id;
        update.reviewedAt = new Date();
      }
    }

    if (content !== undefined) {
      const trimmed = typeof content === 'string' ? content.trim() : '';
      if (trimmed.length === 0) {
        return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
      }
      update.content = trimmed;
    }

    if (rating !== undefined) {
      const n = Number(rating);
      if (!Number.isFinite(n) || n < 1 || n > 5) {
        return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 });
      }
      update.rating = Math.round(n);
    }

    if (rejectionReason !== undefined) {
      update.rejectionReason = typeof rejectionReason === 'string' ? rejectionReason.trim() || null : null;
    }

    if (photoUrl !== undefined) {
      update.photoUrl = typeof photoUrl === 'string' ? photoUrl.trim() || null : null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await prisma.testimonial.update({
      where: { id },
      data: update,
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
    });

    return NextResponse.json({ testimonial: updated });
  } catch (error) {
    console.error('[admin/testimonials/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/testimonials/[id]
 * Admin API: soft-delete a testimonial.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const scopedWhere = await buildScopedWhere(id, user.id);
    if (!scopedWhere) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const existing = await prisma.testimonial.findFirst({ where: scopedWhere });
    if (!existing)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.testimonial.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/testimonials/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
