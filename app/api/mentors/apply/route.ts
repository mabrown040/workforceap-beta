import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';

export async function POST(req: NextRequest) {
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
  if (user) {
    const existing = await prisma.mentor.findUnique({ where: { userId: user.id } });
    if (existing) {
      return NextResponse.json({ error: 'You already have a mentor application on file.' }, { status: 409 });
    }
    await prisma.mentor.create({
      data: {
        userId: user.id,
        fullName,
        title,
        company,
        industry,
        bio,
        linkedinUrl: linkedinUrl ?? null,
        availableHours: availableHours ?? 2,
        isActive: false, // pending approval
      },
    });
  }

  return NextResponse.json({ success: true });
}
