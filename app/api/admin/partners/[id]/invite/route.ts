import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { findSupabaseAuthUserByEmail } from '@/lib/auth/supabaseAdminUsers';
import { z } from 'zod';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  email: z.string().email(),
});

async function ensurePartnerUserLink(userId: string, partnerId: string) {
  const existing = await prisma.partnerUser.findFirst({
    where: { userId },
    select: { id: true, partnerId: true },
  });

  if (existing) {
    if (existing.partnerId !== partnerId) {
      // Block cross-org partner moves: verify the new partner is in the
      // same organization as the existing partner before relinking.
      const [oldPartner, newPartner] = await Promise.all([
        prisma.partner.findFirst({ where: { id: existing.partnerId }, select: { organizationId: true } }),
        prisma.partner.findFirst({ where: { id: partnerId }, select: { organizationId: true } }),
      ]);
      if (oldPartner?.organizationId && newPartner?.organizationId &&
          oldPartner.organizationId !== newPartner.organizationId) {
        throw new Error(
          `Cross-tenant partner relink blocked: existing partner ${existing.partnerId} ` +
          `is in org ${oldPartner.organizationId}, target partner ${partnerId} ` +
          `is in org ${newPartner.organizationId}.`
        );
      }
      await prisma.partnerUser.update({
        where: { id: existing.id },
        data: { partnerId },
      });
    }
    return;
  }

  await prisma.partnerUser.create({
    data: { partnerId, userId },
  });
}

async function ensurePartnerInviteUser(params: {
  userId: string;
  organizationId: string;
  email: string;
  fullName: string;
}) {
  const existing = await prisma.user.findFirst({
    where: { id: params.userId },
    select: { id: true, organizationId: true },
  });

  if (existing) {
    // Block cross-organization moves: if the user already exists in a
    // different org, reject instead of silently overwriting their tenant.
    if (existing.organizationId && existing.organizationId !== params.organizationId) {
      throw new Error(
        `User already belongs to organization ${existing.organizationId}. ` +
        `Cross-tenant partner invites are not allowed.`
      );
    }
    await prisma.user.update({
      where: { id: params.userId },
      data: {
        organizationId: params.organizationId,
        email: params.email,
        fullName: params.fullName,
      },
      select: { id: true },
    });
    return;
  }

  await prisma.user.create({
    data: {
      id: params.userId,
      organizationId: params.organizationId,
      email: params.email,
      fullName: params.fullName,
    },
    select: { id: true },
  });
}export const POST = withApiGuc(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const adminUser = await getUser();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      await requireAdmin(adminUser.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    const { id: partnerId } = await params;
    // Partner is tenant-scoped. An Org A admin cannot invite a user
    // to an Org B partner.
    const orgId = await getActorOrganizationId(adminUser.id);
    const partner = await withTenantScope(orgId, (db) =>
      db.partner.findFirst({ where: { id: partnerId } }),
    );
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
  
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid email' }, { status: 400 });
    }
  
    const email = parsed.data.email.toLowerCase().trim();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
    const displayName = partner.contactName?.trim() || 'Partner User';
  
    let authUserId: string | null = null;
    const supabase = getSupabaseAdmin();
  
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/partner`,
      data: { full_name: displayName },
    });
  
    if (!inviteError && inviteData.user?.id) {
      authUserId = inviteData.user.id;
    } else {
      authUserId = (await findSupabaseAuthUserByEmail(supabase, email, { perPage: 200, maxPages: 25 }))?.id ?? null;
      if (!authUserId) {
        const msg = inviteError?.message ?? 'Could not invite or find this user';
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }
  
    try {
      await ensurePartnerInviteUser({
        userId: authUserId,
        organizationId: partner.organizationId,
        email,
        fullName: displayName,
      });
  
      await ensurePartnerUserLink(authUserId, partnerId);
    } catch (e) {
      console.error('Partner invite DB error:', e);
      return NextResponse.json({ error: 'Failed to link partner user' }, { status: 500 });
    }
  
    return NextResponse.json({ ok: true, userId: authUserId });
  } catch (error) {
    console.error('/admin/partners/[id]/invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
