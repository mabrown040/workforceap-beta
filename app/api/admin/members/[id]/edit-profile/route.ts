import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { invalidateMemberState } from '@/lib/member/getMemberState';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

const schema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).optional().nullable(),
  profilePhone: z.string().max(30).optional().nullable(),
  profileAddress: z.string().max(300).optional().nullable(),
  profileBio: z.string().max(2000).optional().nullable(),
  profileLinkedin: z.string().url().max(300).optional().nullable().or(z.literal('')),
});export const PATCH = withApiGuc(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const admin = await getUser();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(admin.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    const { id } = await params;
  
    let body: unknown;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
  
    const { fullName, phone, profilePhone, profileAddress, profileBio, profileLinkedin } = parsed.data;

    // Tenant scope: User.update wrapped so an admin from Org A cannot
    // edit an Org B member's name/phone by guessing their UUID. The
    // scope proxy adds `organizationId: orgId` to the where filter.
    const orgId = await getActorOrganizationId(admin.id);

    try {
      // Verify the member belongs to this admin's org before touching
      // Profile (which isn't tenant-scoped via withTenantScope but is
      // FK-tied to User.organizationId). If the user.update below
      // doesn't match, Prisma throws P2025 → 404.
      const user = await withTenantScope(orgId, (db) =>
        db.user.update({
          where: { id },
          data: {
            ...(fullName !== undefined ? { fullName } : {}),
            ...(phone !== undefined ? { phone } : {}),
          },
          select: { id: true, fullName: true, email: true },
        }),
      );
  
      // Update profile fields if any profile data provided
      if (profilePhone !== undefined || profileAddress !== undefined || profileBio !== undefined || profileLinkedin !== undefined) {
        await prisma.$transaction((tx) => tx.profile.upsert({
          where: { userId: id },
          create: {
            userId: id,
            profilePhone: profilePhone ?? null,
            profileAddress: profileAddress ?? null,
            profileBio: profileBio ?? null,
            profileLinkedin: profileLinkedin || null,
          },
          update: {
            ...(profilePhone !== undefined ? { profilePhone } : {}),
            ...(profileAddress !== undefined ? { profileAddress } : {}),
            ...(profileBio !== undefined ? { profileBio } : {}),
            ...(profileLinkedin !== undefined ? { profileLinkedin: profileLinkedin || null } : {}),
          },
        }));
      }
  
      // Invalidate cached member state so dashboard reflects changes immediately
      await invalidateMemberState(id);

      void auditLog({ actorUserId: admin.id, action: 'admin_member_profile_edited', targetType: 'User', targetId: id, metadata: {} }).catch(() => {});
      logAuditEvent({ user: { id: admin.id, role: 'admin' }, verb: 'updated', object: { type: 'MemberProfile', id }, result: { success: true } }).catch(() => {});
      return NextResponse.json({ success: true, user });
    } catch (e) {
      console.error('[admin/edit-profile]', e);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/members/[id]/edit-profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
