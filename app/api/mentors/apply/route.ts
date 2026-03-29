import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, title, company, industry, bio, linkedinUrl, availableHours, specialties } = body;

    if (!fullName || !title || !company || !industry || !bio) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if already applied
    const existing = await prisma.mentor.findUnique({ where: { userId: user.id } });
    if (existing) {
      return NextResponse.json({ error: 'You have already submitted a mentor application' }, { status: 409 });
    }

    const mentor = await prisma.mentor.create({
      data: {
        userId: user.id,
        fullName,
        title,
        company,
        industry,
        bio,
        linkedinUrl: linkedinUrl || null,
        availableHours: availableHours || 2,
        isActive: false, // requires admin approval
        specialties: {
          create: (specialties as string[] || []).map((name: string) => ({ name })),
        },
      },
    });

    return NextResponse.json({ mentorId: mentor.id }, { status: 201 });
  } catch (err) {
    console.error('Mentor apply error:', err);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
