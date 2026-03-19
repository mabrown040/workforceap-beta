import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const partnerSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
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

  const partner = await prisma.partner.create({ data: parsed.data });
  return NextResponse.json(partner, { status: 201 });
}