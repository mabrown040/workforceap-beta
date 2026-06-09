import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

const waitlistSchema = z.object({
  email: z.string().email().min(1).max(200),
  programSlug: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = waitlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid body' },
        { status: 400 }
      );
    }

    const { email, programSlug } = parsed.data;

    const existing = await prisma.programWaitlist.findFirst({
      where: { email: email.toLowerCase(), programSlug },
    });

    if (existing) {
      return NextResponse.json(
        { message: 'You are already on the waitlist for this program.' },
        { status: 200 }
      );
    }

    await prisma.programWaitlist.create({
      data: {
        email: email.toLowerCase(),
        programSlug,
      },
    });

    return NextResponse.json(
      { message: 'You have been added to the waitlist.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[waitlist] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programSlug = searchParams.get('programSlug');
    if (!programSlug) {
      return NextResponse.json(
        { error: 'programSlug is required' },
        { status: 400 }
      );
    }

    const count = await prisma.programWaitlist.count({
      where: { programSlug },
    });

    return NextResponse.json({ count, programSlug });
  } catch (error) {
    console.error('[waitlist] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
