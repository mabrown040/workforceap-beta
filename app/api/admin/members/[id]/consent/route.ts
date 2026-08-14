import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';

const bodySchema = z.object({
  isMinor: z.boolean().optional(),
  parentGuardianName: z.string().max(200).optional().nullable(),
  parentGuardianEmail: z
    .union([z.string().email(), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  parentGuardianPhone: z.string().max(50).optional().nullable(),
  parentalConsentGiven: z.boolean().optional(),
  schoolName: z.string().max(200).optional().nullable(),
  gradeLevel: z.string().max(20).optional().nullable(),
});

export const PATCH = withApiGuc(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      await requireAdmin(user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: memberId } = await params;
    const orgId = await getActorOrganizationId(user.id);
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
    }

    const member = await withTenantScope(orgId, (db) =>
      db.user.findFirst({ where: { id: memberId }, select: { id: true } }),
    );
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const data = parsed.data;
    const now = new Date();
    await withTenantScope(orgId, (db) =>
      db.profile.upsert({
        where: { userId: memberId },
        create: {
          userId: memberId,
          isMinor: data.isMinor ?? false,
          parentGuardianName: data.parentGuardianName?.trim() || null,
          parentGuardianEmail: data.parentGuardianEmail?.trim() || null,
          parentGuardianPhone: data.parentGuardianPhone?.trim() || null,
          parentalConsentGiven: data.parentalConsentGiven ?? false,
          parentalConsentDate: data.parentalConsentGiven ? now : null,
          schoolName: data.schoolName?.trim() || null,
          gradeLevel: data.gradeLevel?.trim() || null,
        },
        update: {
          ...(data.isMinor !== undefined ? { isMinor: data.isMinor } : {}),
          ...(data.parentGuardianName !== undefined ? { parentGuardianName: data.parentGuardianName?.trim() || null } : {}),
          ...(data.parentGuardianEmail !== undefined ? { parentGuardianEmail: data.parentGuardianEmail?.trim() || null } : {}),
          ...(data.parentGuardianPhone !== undefined ? { parentGuardianPhone: data.parentGuardianPhone?.trim() || null } : {}),
          ...(data.parentalConsentGiven !== undefined
            ? {
                parentalConsentGiven: data.parentalConsentGiven,
                parentalConsentDate: data.parentalConsentGiven ? now : null,
              }
            : {}),
          ...(data.schoolName !== undefined ? { schoolName: data.schoolName?.trim() || null } : {}),
          ...(data.gradeLevel !== undefined ? { gradeLevel: data.gradeLevel?.trim() || null } : {}),
        },
      }),
    );

    await auditLog({
      actorUserId: user.id,
      action: 'admin_member_consent_updated',
      targetType: 'User',
      targetId: memberId,
      metadata: { parentalConsentGiven: data.parentalConsentGiven ?? null, isMinor: data.isMinor ?? null },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('/api/admin/members/[id]/consent', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
