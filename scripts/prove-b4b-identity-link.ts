/**
 * Prove B4B org-wide sync attaches Coursera alt-email reports to a portal user
 * via coursera_identity_mappings — the path that previously stayed unresolved.
 *
 * Usage:
 *   node scripts/prisma-env.js npx tsx scripts/prove-b4b-identity-link.ts
 */
import { randomUUID } from 'node:crypto';

import { prisma } from '../lib/db/prisma';
import { _setFetchForTesting } from '../lib/coursera/b4bClient';
import { syncCourseraB4BEnrollmentReports } from '../lib/coursera/b4bSync';
import { resolveUserIdsByCourseraEmails } from '../lib/coursera/resolveUserIdByEmail';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function main() {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) throw new Error('No organization — seed the DB first');

  const stamp = Date.now();
  const portalEmail = `prove-portal-${stamp}@example.com`;
  const altEmail = `prove-coursera-${stamp}@gmail.com`;
  const userId = randomUUID();
  const mappingId = randomUUID();
  const contentId = `prove-course-${stamp}`;
  const contentName = `Prove Course ${stamp}`;

  process.env.COURSERA_ORG_ID = process.env.COURSERA_ORG_ID?.trim() || 'prove-org';
  process.env.COURSERA_B4B_CLIENT_ID = process.env.COURSERA_B4B_CLIENT_ID?.trim() || 'prove-id';
  process.env.COURSERA_B4B_CLIENT_SECRET =
    process.env.COURSERA_B4B_CLIENT_SECRET?.trim() || 'prove-secret';

  await prisma.user.create({
    data: {
      id: userId,
      email: portalEmail,
      fullName: 'Prove B4B Link',
      organizationId: org.id,
    },
  });

  await prisma.$executeRaw`
    INSERT INTO coursera_identity_mappings (id, user_id, coursera_email, source, created_at, updated_at)
    VALUES (${mappingId}, ${userId}, ${altEmail}, 'prove-fixture', now(), now())
  `;

  _setFetchForTesting(async (input) => {
    const url = String(input);
    if (url.includes('oauth2')) {
      return jsonResponse({ access_token: 'prove-token', expires_in: 3600 });
    }
    if (url.includes('enrollmentReports')) {
      return jsonResponse({
        elements: [
          {
            id: `enr-${stamp}`,
            programId: 'prove-program',
            externalId: altEmail,
            contentId,
            contentType: 'Course',
            isCompleted: false,
            lastActivityAt: stamp,
            enrolledAt: stamp,
            overallProgress: 41,
            membershipState: 'MEMBER',
            updatedAt: stamp,
            contentName,
            contentSlug: `prove-course-${stamp}`,
            fullName: 'Prove Learner',
            email: altEmail,
            programName: 'Prove Program',
            programSlug: 'prove-program',
          },
        ],
        paging: { total: 1 },
      });
    }
    return jsonResponse({ error: `unexpected fetch ${url}` }, 404);
  });

  const failures: string[] = [];

  try {
    // Baseline: old B4B lookup was users.email only — alt Coursera email misses.
    const oldHit = await prisma.user.findFirst({
      where: { deletedAt: null, email: { equals: altEmail, mode: 'insensitive' } },
      select: { id: true },
    });
    if (oldHit) failures.push('BASELINE FAIL: portal user unexpectedly has the Coursera alt email');
    else console.log('BASELINE: users.email lookup for Coursera alt email → miss (the old cron skip)');

    const resolved = await resolveUserIdsByCourseraEmails([altEmail, portalEmail]);
    if (resolved.get(altEmail) !== userId) {
      failures.push(`resolver missed alt email; map=${JSON.stringify([...resolved])}`);
    } else {
      console.log('RESOLVER: alt Coursera email → portal userId');
    }

    const result = await syncCourseraB4BEnrollmentReports();
    console.log('SYNC RESULT:', JSON.stringify(result, null, 2));

    if (result.skippedNoEmail !== 0) {
      failures.push(`expected skippedNoEmail=0, got ${result.skippedNoEmail}`);
    }
    if (result.upserted < 1) {
      failures.push(`expected upserted>=1, got ${result.upserted}`);
    }
    if (result.errors !== 0) {
      failures.push(`expected errors=0, got ${result.errors}: ${JSON.stringify(result.byUser)}`);
    }

    const progress = await prisma.courseProgress.findMany({
      where: { userId },
      select: { userId: true, programSlug: true, courseSlug: true, percentComplete: true, courseId: true },
    });
    console.log('COURSE_PROGRESS:', JSON.stringify(progress, null, 2));
    if (progress.length < 1) {
      failures.push('no course_progress row on the portal user');
    } else if (progress.every((row) => row.userId !== userId)) {
      failures.push('course_progress userId mismatch');
    }

    const rollup = await prisma.memberProgramProgress.findMany({
      where: { userId },
      select: { userId: true, programSlug: true, averagePercent: true, coursesCompleted: true },
    });
    console.log('MEMBER_PROGRAM_PROGRESS:', JSON.stringify(rollup, null, 2));
    if (rollup.length < 1) {
      failures.push(
        'no member_program_progress rollup — mapped users were skipped when rollup keyed off Coursera email',
      );
    }

    // Old rollup lookup would have used the Coursera email and found nobody.
    const oldRollupLookup = await prisma.user.findMany({
      where: { email: { in: [altEmail], mode: 'insensitive' }, deletedAt: null },
      select: { id: true },
    });
    if (oldRollupLookup.length !== 0) {
      failures.push('old email-keyed rollup would have found a user; fixture is wrong');
    } else {
      console.log('OLD ROLLUP LOOKUP: Coursera alt email matches 0 users (would have skipped rollup)');
    }
  } finally {
    _setFetchForTesting(null);
    await prisma.memberProgramProgress.deleteMany({ where: { userId } });
    await prisma.courseProgress.deleteMany({ where: { userId } });
    await prisma.$executeRaw`DELETE FROM coursera_identity_mappings WHERE id = ${mappingId}`;
    await prisma.user.deleteMany({ where: { id: userId } });
  }

  if (failures.length > 0) {
    console.error('PROVE FAILED:\n- ' + failures.join('\n- '));
    process.exitCode = 1;
    return;
  }
  console.log('PROVE PASSED: B4B sync linked alt-email report → portal user + rollup');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
