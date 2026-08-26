/**
 * Coursera → portal link coverage audit (+ optional local fixture smoke).
 *
 * Usage:
 *   node scripts/prisma-env.js npx tsx scripts/audit-coursera-links.ts
 *   node scripts/prisma-env.js npx tsx scripts/audit-coursera-links.ts --fixture
 */
import { randomUUID } from 'node:crypto';

import { prisma } from '../lib/db/prisma';
import { auditCourseraLinkHealth } from '../lib/coursera/linkHealth';
import { resolveUserIdsByCourseraEmails } from '../lib/coursera/resolveUserIdByEmail';

async function runFixture(): Promise<void> {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) throw new Error('No organization row — seed the DB first');

  const portalEmail = `coursera-link-audit-${Date.now()}@example.com`;
  const altEmail = `coursera-alt-${Date.now()}@example.com`;
  const userId = randomUUID();
  const mappingId = randomUUID();
  const progressId = randomUUID();

  await prisma.user.create({
    data: {
      id: userId,
      email: portalEmail,
      fullName: 'Coursera Link Audit',
      organizationId: org.id,
    },
  });

  await prisma.$executeRaw`
    INSERT INTO coursera_identity_mappings (id, user_id, coursera_email, source, created_at, updated_at)
    VALUES (${mappingId}, ${userId}, ${altEmail}, 'audit-fixture', now(), now())
  `;

  await prisma.$executeRaw`
    INSERT INTO coursera_course_progress (
      id, user_id, organization_id, external_email, coursera_course_id, course_name,
      program_slug, overall_progress, learning_hours, is_completed, source, last_synced_at
    ) VALUES (
      ${progressId}, NULL, ${org.id}, ${altEmail}, 'course-fixture-1', 'Fixture Course',
      'fixture-program', 42.5, 1.0, false, 'audit-fixture', now()
    )
  `;

  try {
    const map = await resolveUserIdsByCourseraEmails([portalEmail, altEmail]);
    if (map.get(portalEmail) !== userId) {
      throw new Error(`Expected portal email to resolve to ${userId}`);
    }
    if (map.get(altEmail) !== userId) {
      throw new Error('Expected alt Coursera email to resolve via identity mapping');
    }
    console.log('resolve OK:', { portalEmail, altEmail, userId });

    const before = await auditCourseraLinkHealth();
    console.log('health before heal:', JSON.stringify(before, null, 2));
    if (before.healableOrphans.courseProgress < 1) {
      throw new Error('Expected at least one healable course orphan before heal');
    }

    // Same link step as backfillAllOrphanedCourseraProgress (without CSV promote).
    await prisma.$executeRaw`
      UPDATE coursera_course_progress
      SET user_id = ${userId}
      WHERE id = ${progressId} AND user_id IS NULL
    `;

    const orphans = await prisma.$queryRaw<Array<{ n: number }>>`
      SELECT COUNT(*)::int AS n
      FROM coursera_course_progress
      WHERE id = ${progressId} AND user_id IS NULL
    `;
    if (Number(orphans[0]?.n) !== 0) {
      throw new Error('Orphan course progress was not linked');
    }
    console.log('fixture PASSED — alt email resolved and orphan linked');
  } finally {
    await prisma.$executeRaw`DELETE FROM coursera_course_progress WHERE id = ${progressId}`;
    await prisma.$executeRaw`DELETE FROM coursera_identity_mappings WHERE id = ${mappingId}`;
    await prisma.user.deleteMany({ where: { id: userId } });
  }
}

async function main() {
  const withFixture = process.argv.includes('--fixture');
  const health = await auditCourseraLinkHealth();
  console.log(JSON.stringify({ ok: true, health }, null, 2));

  if (withFixture) {
    await runFixture();
  }

  const healable =
    health.healableOrphans.courseProgress + health.healableOrphans.badgeProgress;
  if (healable > 0 && !withFixture) {
    console.log(
      `\n${healable} healable orphan(s) detected. POST /api/admin/coursera/backfill-orphans to heal.`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
