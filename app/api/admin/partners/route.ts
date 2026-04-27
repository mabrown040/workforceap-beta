import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { z } from 'zod';

const partnerSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  referralCode: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Referral code must be lowercase letters, numbers, and hyphens only')
    .optional(),
  logoUrl: z.string().url().optional().nullable(),
  contactName: z.string().max(200).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const partners = await prisma.partner.findMany({
    take: 500,
    orderBy: { name: 'asc' },
    include: { _count: { select: { counselors: true, referrals: true } } },
  });
  return NextResponse.json(partners);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });

  const existing = await prisma.partner.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return NextResponse.json({ error: 'A partner with this slug already exists' }, { status: 400 });

  const referralCode = parsed.data.referralCode ?? parsed.data.slug;
  const codeTaken = await prisma.partner.findFirst({
    where: { OR: [{ referralCode }, { slug: referralCode }] },
  });
  if (codeTaken) {
    return NextResponse.json(
      { error: 'Referral code must be unique and different from other partners slugs' },
      { status: 400 }
    );
  }

  const { referralCode: _rc, ...rest } = parsed.data;
  const organizationId = await getDefaultOrganizationId();
  const partner = await prisma.partner.create({ data: { ...rest, referralCode, organizationId } });
  return NextResponse.json(partner, { status: 201 });
}