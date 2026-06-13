import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const POST = withApiGuc(async (req: NextRequest) => {
  try {
  const user = await getUser();
  const body = await req.json() as {
    fullName: string;
    title: string;
    company: string;
    industry: string;
    bio: string;
    linkedinUrl?: string;
    availableHours?: number;
  };

  const { fullName, title, company, industry, bio, linkedinUrl, availableHours } = body;

  if (!fullName || !title || !company || !industry || !bio) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

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
      linkedinUrl: linkedinUrl ?? null,
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

