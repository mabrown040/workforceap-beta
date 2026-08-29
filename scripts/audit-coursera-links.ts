/**
 * Read-only Coursera → portal link coverage audit.
 *
 * Usage:
 *   node scripts/prisma-env.js npx tsx scripts/audit-coursera-links.ts
 *
 * The former --fixture mode wrote directly to the legacy global raw-progress
 * tables. It was removed so every raw course/badge mutation flows through the
 * shared transactional writer and advisory-lock contract.
 */
import { prisma } from '../lib/db/prisma';
import { auditCourseraLinkHealth } from '../lib/coursera/linkHealth';

async function main() {
  if (process.argv.includes('--fixture')) {
    throw new Error(
      '--fixture was removed: this audit is read-only and must not mutate Coursera raw progress',
    );
  }

  const health = await auditCourseraLinkHealth();
  console.log(JSON.stringify({ ok: true, health }, null, 2));

  const healable =
    health.healableOrphans.courseProgress + health.healableOrphans.badgeProgress;
  if (healable > 0) {
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
