import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100),
  phone: z.string().max(50).nullable(),
  address: z.string().max(500).nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  linkedin: z.string().max(500).nullable(),
  bio: z.string().max(2000).nullable(),
  financialAidInterest: z.boolean().optional(),
  referralSource: z.string().max(200).optional().nullable(),
});

export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const { firstName, lastName, phone, address, city, state, zip, linkedin, bio, financialAidInterest, referralSource } =
    parsed.data;
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { fullName, phone: phone || null },
    });
    await tx.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        profilePhone: phone || null,
        profileAddress: address || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        zip: zip?.trim() || null,
        profileLinkedin: linkedin?.trim() ? linkedin.trim() : null,
        profileBio: bio || null,
        ...(financialAidInterest !== undefined ? { financialAidInterest } : {}),
        ...(referralSource !== undefined ? { referralSource: referralSource?.trim() || null } : {}),
      },
      update: {
        profilePhone: phone || null,
        profileAddress: address || null,
        ...(city !== undefined ? { city: city?.trim() || null } : {}),
        ...(state !== undefined ? { state: state?.trim() || null } : {}),
        ...(zip !== undefined ? { zip: zip?.trim() || null } : {}),
        profileLinkedin: linkedin?.trim() ? linkedin.trim() : null,
        profileBio: bio || null,
        ...(financialAidInterest !== undefined ? { financialAidInterest } : {}),
        ...(referralSource !== undefined ? { referralSource: referralSource?.trim() || null } : {}),
      },
    });
  });

  return NextResponse.json({ ok: true });
}
