import { NextRequest, NextResponse } from 'next/server';

/**
 * TODO: Waitlist API — requires schema migration
 * Add `model ProgramWaitlist` to Prisma schema before enabling:
 *   model ProgramWaitlist {
 *     id          String   @id @default(uuid())
 *     email       String
 *     programSlug String   @map("program_slug")
 *     createdAt   DateTime @default(now()) @map("created_at")
 *     @@unique([email, programSlug])
 *   }
 *
 * Currently returns a graceful message directing members to contact support.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email;
    const programSlug = body?.programSlug;

    if (!email || !programSlug) {
      return NextResponse.json(
        { error: 'Email and programSlug are required.' },
        { status: 400 }
      );
    }

    // TODO: Re-enable after Prisma schema migration
    return NextResponse.json(
      {
        message:
          'Thank you for your interest. Program waitlist enrollment is coming soon. Please email contact@workforceap.org or call (512) 555-1234 to reserve your spot.',
        _note: 'Waitlist schema migration required',
      },
      { status: 200 }
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

    // TODO: Re-enable after Prisma schema migration
    return NextResponse.json(
      {
        count: 0,
        programSlug,
        _note: 'Waitlist schema migration required',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[waitlist] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
