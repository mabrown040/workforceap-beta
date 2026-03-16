import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    user: {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      phone: dbUser.phone,
    },
    profile: dbUser.profile
      ? {
          address: dbUser.profile.address,
          city: dbUser.profile.city,
          state: dbUser.profile.state,
          zip: dbUser.profile.zip,
        }
      : null,
  });
}

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

  const { fullName, phone, address, city, state, zip } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const userData: Record<string, unknown> = {};
    if (fullName !== undefined) userData.fullName = fullName;
    if (phone !== undefined) userData.phone = phone;

    if (Object.keys(userData).length > 0) {
      await tx.user.update({
        where: { id: user.id },
        data: userData,
      });
    }

    const profileData: Record<string, unknown> = {};
    if (address !== undefined) profileData.address = address;
    if (city !== undefined) profileData.city = city;
    if (state !== undefined) profileData.state = state;
    if (zip !== undefined) profileData.zip = zip;

    if (Object.keys(profileData).length > 0) {
      await tx.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          ...profileData,
        } as { userId: string; address?: string; city?: string; state?: string; zip?: string },
        update: profileData,
      });
    }
  });

  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });

  return NextResponse.json({
    user: updated
      ? {
          id: updated.id,
          email: updated.email,
          fullName: updated.fullName,
          phone: updated.phone,
        }
      : null,
    profile: updated?.profile
      ? {
          address: updated.profile.address,
          city: updated.profile.city,
          state: updated.profile.state,
          zip: updated.profile.zip,
        }
      : null,
  });
}
