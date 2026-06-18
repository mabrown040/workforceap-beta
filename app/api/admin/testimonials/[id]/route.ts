import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit/log';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { TestimonialStatus } from '@prisma/client';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';

function buildTestimonialRecordWhere(id: string, orgId: string | null) {
  return {
    id,
    deletedAt: null,
    ...(orgId ? { member: { organizationId: orgId } } : {}),
  };
}

async function getTestimonialRecordWhere(userId: string, id: string) {
  const orgId = (await isSuperAdmin(userId)) ? null : await getActorOrganizationId(userId);
  return buildTestimonialRecordWhere(id, orgId);
}

async function _PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const recordWhere = await getTestimonialRecordWhere(user.id, id);
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const existing = await prisma.$transaction((tx) => tx.testimonial.findFirst({
      where: recordWhere,
    }));
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

    const updateResult = await prisma.$transaction((tx) => tx.testimonial.updateMany({
      where: recordWhere,
      data: update,
    }));
    if (updateResult.count === 0)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.$transaction((tx) => tx.testimonial.findFirst({
      where: recordWhere,
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
    }));
    if (!updated)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    void auditLog({ actorUserId: user.id, action: 'testimonial_status_update', targetType: 'testimonial', targetId: id, metadata: { status: updated.status } }).catch(() => {});
    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'Testimonial', id }, result: { success: true, extensions: { status: updated.status } } }).catch(() => {});
    return NextResponse.json({ testimonial: updated });
  } catch (error) {
    console.error('[admin/testimonials/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const PATCH = withApiGuc(_PATCH);

async function _DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const recordWhere = await getTestimonialRecordWhere(user.id, id);
    const existing = await prisma.$transaction((tx) => tx.testimonial.findFirst({
      where: recordWhere,
    }));
    if (!existing)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updateResult = await prisma.$transaction((tx) => tx.testimonial.updateMany({
      where: recordWhere,
      data: { deletedAt: new Date() },
    }));
    if (updateResult.count === 0)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    void auditLog({ actorUserId: user.id, action: 'testimonial_delete', targetType: 'testimonial', targetId: id, metadata: {} }).catch(() => {});
    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'deleted', object: { type: 'Testimonial', id }, result: { success: true } }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/testimonials/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);
