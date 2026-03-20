import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { z } from 'zod';

const bodySchema = z.object({
  email: z.string().email(),
});

async function findAuthUserIdByEmail(admin: ReturnType<typeof getSupabaseAdmin>, email: string): Promise<string | null> {
  const normalized = email.toLowerCase().trim();
  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 25; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) return null;
    const found = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (found?.id) return found.id;
    if (data.users.length < perPage) return null;
    page++;
  }
  return null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getUser();
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(adminUser.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: partnerId } = await params;
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid email' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
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
    authUserId = await findAuthUserIdByEmail(supabase, email);
    if (!authUserId) {
      const msg = inviteError?.message ?? 'Could not invite or find this user';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  try {
    await prisma.user.upsert({
      where: { id: authUserId },
      create: {
        id: authUserId,
        email,
        fullName: displayName,
      },
      update: { email },
    });

    await prisma.partnerUser.upsert({
      where: { userId: authUserId },
      create: { partnerId, userId: authUserId },
      update: { partnerId },
    });
  } catch (e) {
    console.error('Partner invite DB error:', e);
    return NextResponse.json({ error: 'Failed to link partner user' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId: authUserId });
}
