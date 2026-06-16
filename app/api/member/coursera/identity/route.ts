import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { checkCourseraIdentityRateLimit } from '@/lib/rate-limit';
import { upsertCourseraIdentityMapping } from '@/lib/xapi/mappings';
import { backfillUserIdForCourseraEmail } from '@/lib/coursera/csvImport.server';

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-vercel-forwarded-for') ??
    'unknown'
  );
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export const POST = withApiGuc(async (request: Request) => {
  try {
    // Rate-limit Coursera identity spray (AUDIT §H-S14).
    const { success } = await checkCourseraIdentityRateLimit(getClientIp(request));
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  
    const courseraEmail = normalizeEmail((body as Record<string, unknown>)?.courseraEmail);
    if (!courseraEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courseraEmail)) {
      return NextResponse.json({ error: 'Enter a valid Coursera email address.' }, { status: 400 });
    }
  
    try {
      // Prevent one member from stealing another member's Coursera identity (AUDIT §H-S14).
      const existingMapping = await prisma.$queryRaw<Array<{ userId: string }>>`
        SELECT user_id AS "userId"
        FROM coursera_identity_mappings
        WHERE LOWER(coursera_email) = ${courseraEmail}::text
        LIMIT 1
      `;
      if (existingMapping[0] && existingMapping[0].userId !== user.id) {
        return NextResponse.json({ error: 'This Coursera email is already linked to another account.' }, { status: 409 });
      }

      const mapping = await upsertCourseraIdentityMapping({
        userId: user.id,
        courseraEmail,
        createdByUserId: user.id,
        source: 'member_self_link',
        notes: 'Saved by member from Training page',
      });

      // Backfill historical CSV rows that were orphaned before this mapping existed.
      try {
        await backfillUserIdForCourseraEmail(courseraEmail, user.id);
      } catch (backfillError) {
        console.error('[member/coursera/identity] backfill failed:', backfillError);
      }
  
      return NextResponse.json({ ok: true, courseraEmail: mapping?.courseraEmail ?? courseraEmail });
    } catch (error) {
      console.error('[member/coursera/identity] failed to save Coursera email:', error);
      return NextResponse.json({ error: 'Unable to save your Coursera email right now.' }, { status: 500 });
    }
  } catch (error) {
    console.error('/member/coursera/identity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
