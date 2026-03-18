import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { benefitRequestSchema } from '@/lib/validation/benefitRequest';

const BENEFIT_COOLDOWN_DAYS = 30;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = benefitRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid benefit' }, { status: 400 });
  }

  const { benefit } = parsed.data;

  if (benefit === 'coursera') {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { assessmentCompleted: true },
    });
    if (!dbUser?.assessmentCompleted) {
      return NextResponse.json(
        { error: 'Please complete the skills assessment before requesting Coursera access.', code: 'ASSESSMENT_REQUIRED' },
        { status: 403 }
      );
    }
  }

  const existing = await prisma.benefitRequest.findUnique({
    where: {
      userId_benefit: { userId: user.id, benefit },
    },
  });

  if (existing) {
    if (existing.status === 'APPROVED') {
      return NextResponse.json({ error: 'You already have access to this benefit.', status: 'active' }, { status: 400 });
    }
    if (existing.status === 'PENDING') {
      return NextResponse.json({ error: 'Request already pending.', status: 'pending' }, { status: 400 });
    }
    const daysSince = (Date.now() - existing.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < BENEFIT_COOLDOWN_DAYS) {
      return NextResponse.json(
        { error: `Please wait ${Math.ceil(BENEFIT_COOLDOWN_DAYS - daysSince)} days before requesting again.` },
        { status: 429 }
      );
    }
  }

  const req = await prisma.benefitRequest.upsert({
    where: {
      userId_benefit: { userId: user.id, benefit },
    },
    create: {
      userId: user.id,
      benefit,
      status: 'PENDING',
    },
    update: {
      status: 'PENDING',
    },
  });

  return NextResponse.json({ request: req, status: 'pending' });
}
