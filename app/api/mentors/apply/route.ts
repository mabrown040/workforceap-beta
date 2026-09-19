import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const requiredText = (label: string, max: number) =>
  z.string({ invalid_type_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

/**
 * Body sent by app/mentor/apply/MentorApplyForm. Wrong types or oversized
 * strings used to reach Prisma and surface as a 500.
 */
const mentorApplicationSchema = z.object({
  fullName: requiredText('Full name', 200),
  title: requiredText('Title', 200),
  company: requiredText('Company', 200),
  industry: requiredText('Industry', 100),
  bio: requiredText('Bio', 5000),
  linkedinUrl: z.string().trim().max(500).optional().nullable(),
  availableHours: z.number().int().min(1).max(160).optional().nullable(),
});

export const POST = withApiGuc(async (req: NextRequest) => {
  try {
  const user = await getUser();
  const parsed = mentorApplicationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Missing required fields' },
      { status: 400 },
    );
  }
  const { fullName, title, company, industry, bio, linkedinUrl, availableHours } = parsed.data;

  // If logged in, create mentor record linked to user; otherwise store anonymous application
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to apply as a mentor. Please create a member account first.' }, { status: 401 });
  }

  const existing = await prisma.$transaction((tx) => tx.mentor.findUnique({ where: { userId: user.id } }));
  if (existing) {
    return NextResponse.json({ error: 'You already have a mentor application on file.' }, { status: 409 });
  }

  await prisma.$transaction((tx) => tx.mentor.create({
    data: {
      userId: user.id,
      fullName,
      title,
      company,
      industry,
      bio,
      linkedinUrl: linkedinUrl || null,
      availableHours: availableHours ?? 2,
      isActive: false, // pending admin approval
    },
  }));

  return NextResponse.json({ success: true });

  } catch (error) {
    console.error('/mentors/apply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

