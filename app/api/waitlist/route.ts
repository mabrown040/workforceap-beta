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
 * Until then both handlers validate input exactly as the enabled route will,
 * log the unavailability server-side, and return a stable 503. The
 * migration-status note lives here and in the server log only; it is not
 * part of the public response body.
 */

const WAITLIST_UNAVAILABLE =
  'Program waitlist is temporarily unavailable. Please email contact@workforceap.org or call (512) 777-1808 to reserve your spot.';

function waitlistUnavailable(method: 'GET' | 'POST', programSlug: string) {
  console.warn(`[waitlist] ${method} unavailable: ProgramWaitlist schema migration required`, { programSlug });
  return NextResponse.json({ error: WAITLIST_UNAVAILABLE }, { status: 503 });
}

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
    return waitlistUnavailable('POST', String(programSlug));
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
    return waitlistUnavailable('GET', programSlug);
  } catch (error) {
    console.error('[waitlist] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
