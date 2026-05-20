/**
 * scripts/p1/test-force-rls.ts
 *
 * FORCE ROW LEVEL SECURITY staging rehearsal harness.
 *
 * Goal: Before flipping `ALTER TABLE ... FORCE ROW LEVEL SECURITY` in
 * production, run this harness against a shadow database to prove that
 * every persona's read/write surface still works under enforced RLS.
 *
 * What this script does (idempotent, non-destructive against shadow):
 *   1. Connects to the shadow DB (SHADOW_DATABASE_URL env var) and
 *      *refuses* to run against anything resembling production.
 *   2. Runs `prisma db push` so the shadow schema matches the current
 *      Prisma datamodel, then applies the RLS policy migrations needed
 *      for this rehearsal. Historical migrations are not replayable from
 *      empty because a few early sprint migrations were shipped out of
 *      order after production had already drifted past them.
 *   3. Toggles `FORCE ROW LEVEL SECURITY` on the top 10 high-stakes
 *      tables (selected by policy count from migration
 *      20260513040000_add_rls_policies).
 *   4. Seeds 5 personas across 2 organizations.
 *   5. Wraps every assertion in `runWithGucContext()` so the real
 *      Prisma `$transaction` GUC override (lib/db/prisma.ts) is
 *      exercised end-to-end.
 *   6. Counts pass/fail per persona-test pair and prints a markdown
 *      summary suitable for pasting into a PR or runbook.
 *
 * Exit code = total failures (0 = clean).
 *
 * Usage:
 *   SHADOW_DATABASE_URL=postgres://... \
 *     DATABASE_URL=postgres://... \
 *     pnpm tsx scripts/p1/test-force-rls.ts
 *
 * Linked plan: PLAN-2026-Q3.md §0 + §2.3 P1.
 */

import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import {
  runWithGucContext,
  type GucContext,
  type RlsRole,
} from '../../lib/db/gucContext';

// ----------------------------------------------------------------------
// Safety: never touch production
// ----------------------------------------------------------------------

const PROD_HOST_FRAGMENTS = [
  'prod',
  'production',
  'workforceap.org',
  // Common Supabase prod project ref prefixes; tighten over time as needed.
  'db.workforceap',
];

function assertNotProduction(url: string): void {
  const lower = url.toLowerCase();
  for (const frag of PROD_HOST_FRAGMENTS) {
    if (lower.includes(frag)) {
      throw new Error(
        `Refusing to run FORCE RLS harness: SHADOW_DATABASE_URL contains "${frag}". ` +
          `This script is read+write destructive against the target DB and must never ` +
          `touch production. Point SHADOW_DATABASE_URL at a disposable shadow database.`,
      );
    }
  }
}

// ----------------------------------------------------------------------
// Top 10 tables to enforce (FORCE RLS). Selected from the policy count
// in prisma/migrations/20260513040000_add_rls_policies/migration.sql:
//   job_posting_applications (6), job_applications (6), users (5),
//   profiles (5), jobs (5), partner_users (4), partner_referrals (4),
//   member_next_best_actions (4), invitations (4), employers (4).
// ----------------------------------------------------------------------

const FORCE_RLS_TABLES = [
  'job_posting_applications',
  'job_applications',
  'users',
  'profiles',
  'jobs',
  'partner_users',
  'partner_referrals',
  'member_next_best_actions',
  'invitations',
  'employers',
] as const;

const RLS_POLICY_MIGRATIONS = [
  'prisma/migrations/20260513040000_add_rls_policies/migration.sql',
  'prisma/migrations/20260514000000_defer_rls_force_authorize_system/migration.sql',
  'prisma/migrations/20260514020000_rls_goals_writes_mentor_sessions_enable/migration.sql',
  'prisma/migrations/20260514040000_rls_milestone_cascades/migration.sql',
] as const;

function runPrisma(command: string, env: NodeJS.ProcessEnv): void {
  execSync(command, { stdio: 'inherit', env });
}

// ----------------------------------------------------------------------
// Persona seed identifiers (stable so reruns are idempotent).
// ----------------------------------------------------------------------

const SEED = {
  orgA: '00000000-0000-0000-0000-00000000aaaa',
  orgB: '00000000-0000-0000-0000-00000000bbbb',
  adminA: '00000000-0000-0000-0000-0000000000a1',
  counselorAUser: '00000000-0000-0000-0000-0000000000a2',
  counselorARow: '00000000-0000-0000-0000-0000000000a3',
  memberM1: '00000000-0000-0000-0000-0000000000a4',
  partnerAUser: '00000000-0000-0000-0000-0000000000a5',
  partnerARow: '00000000-0000-0000-0000-0000000000a6',
  partnerAUserRow: '00000000-0000-0000-0000-0000000000a7',
  adminB: '00000000-0000-0000-0000-0000000000b1',
  counselorBUser: '00000000-0000-0000-0000-0000000000b2',
  counselorBRow: '00000000-0000-0000-0000-0000000000b3',
  memberM2: '00000000-0000-0000-0000-0000000000b4',
} as const;

// ----------------------------------------------------------------------
// Test result collection.
// ----------------------------------------------------------------------

type Result = {
  persona: string;
  description: string;
  passed: boolean;
  error?: string;
};

const results: Result[] = [];

async function assertCount(
  persona: string,
  description: string,
  ctx: GucContext,
  query: (client: PrismaClient) => Promise<number>,
  expected: { eq?: number; gte?: number; lte?: number },
  client: PrismaClient,
): Promise<void> {
  try {
    const actual = await runWithGucContext(ctx, () => query(client));
    let ok = true;
    if (expected.eq !== undefined && actual !== expected.eq) ok = false;
    if (expected.gte !== undefined && actual < expected.gte) ok = false;
    if (expected.lte !== undefined && actual > expected.lte) ok = false;
    if (!ok) {
      results.push({
        persona,
        description,
        passed: false,
        error: `expected ${JSON.stringify(expected)}, got ${actual}`,
      });
    } else {
      results.push({ persona, description, passed: true });
    }
  } catch (err) {
    results.push({
      persona,
      description,
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ----------------------------------------------------------------------
// Seed: idempotent inserts using upserts on the bypass-RLS connection.
// ----------------------------------------------------------------------

async function seedPersonas(client: PrismaClient): Promise<void> {
  // Seed must run with FORCE RLS temporarily disabled and as table owner,
  // because we are inserting cross-org rows. We wrap inserts in a SYSTEM
  // GUC context (the migration's helper functions treat role=system as
  // bypass for nothing — but we explicitly disable FORCE here).
  await setForceRls(client, false);

  // Organizations
  await client.$executeRawUnsafe(
    `INSERT INTO organizations (id, name, slug) VALUES
       ($1, 'Org A', 'org-a'),
       ($2, 'Org B', 'org-b')
     ON CONFLICT (id) DO NOTHING`,
    SEED.orgA,
    SEED.orgB,
  );

  // Users (one per persona)
  const userRows: Array<[string, string, string, string]> = [
    [SEED.adminA, SEED.orgA, 'admin-a@example.test', 'Admin A'],
    [SEED.counselorAUser, SEED.orgA, 'counselor-a@example.test', 'Counselor A'],
    [SEED.memberM1, SEED.orgA, 'member-m1@example.test', 'Member M1'],
    [SEED.partnerAUser, SEED.orgA, 'partner-a@example.test', 'Partner A User'],
    [SEED.adminB, SEED.orgB, 'admin-b@example.test', 'Admin B'],
    [SEED.counselorBUser, SEED.orgB, 'counselor-b@example.test', 'Counselor B'],
    [SEED.memberM2, SEED.orgB, 'member-m2@example.test', 'Member M2'],
  ];
  for (const [id, orgId, email, name] of userRows) {
    await client.$executeRawUnsafe(
      `INSERT INTO users (id, organization_id, email, full_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      id,
      orgId,
      email,
      name,
    );
  }

  // Profiles (role baked in)
  const profileRows: Array<[string, string]> = [
    [SEED.adminA, 'admin'],
    [SEED.counselorAUser, 'counselor'],
    [SEED.memberM1, 'member'],
    [SEED.partnerAUser, 'partner'],
    [SEED.adminB, 'admin'],
    [SEED.counselorBUser, 'counselor'],
    [SEED.memberM2, 'member'],
  ];
  for (const [userId, role] of profileRows) {
    await client.$executeRawUnsafe(
      `INSERT INTO profiles (id, user_id, role) VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role`,
      userId,
      role,
    );
  }

  // Counselor rows
  await client.$executeRawUnsafe(
    `INSERT INTO counselors (id, user_id, active) VALUES ($1, $2, true)
     ON CONFLICT (user_id) DO NOTHING`,
    SEED.counselorARow,
    SEED.counselorAUser,
  );
  await client.$executeRawUnsafe(
    `INSERT INTO counselors (id, user_id, active) VALUES ($1, $2, true)
     ON CONFLICT (user_id) DO NOTHING`,
    SEED.counselorBRow,
    SEED.counselorBUser,
  );

  // Counselor A assigned to member m1 (Org A); Counselor B NOT assigned to m1
  await client.$executeRawUnsafe(
    `INSERT INTO counselor_assignments (id, counselor_id, member_id, active)
     VALUES (gen_random_uuid(), $1, $2, true)
     ON CONFLICT (counselor_id, member_id) DO NOTHING`,
    SEED.counselorARow,
    SEED.memberM1,
  );

  // Partner + partner_user + referral (Partner A referred Member M1)
  await client.$executeRawUnsafe(
    `INSERT INTO partners (id, organization_id, name, slug, referral_code, active, status)
     VALUES ($1, $2, 'Partner A', 'partner-a', 'PA001', true, 'active')
     ON CONFLICT (id) DO NOTHING`,
    SEED.partnerARow,
    SEED.orgA,
  );
  await client.$executeRawUnsafe(
    `INSERT INTO partner_users (id, partner_id, user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO NOTHING`,
    SEED.partnerAUserRow,
    SEED.partnerARow,
    SEED.partnerAUser,
  );
  await client.$executeRawUnsafe(
    `INSERT INTO partner_referrals (id, partner_id, member_id)
     VALUES (gen_random_uuid(), $1, $2)
     ON CONFLICT (partner_id, member_id) DO NOTHING`,
    SEED.partnerARow,
    SEED.memberM1,
  );

  await setForceRls(client, true);
}

// ----------------------------------------------------------------------
// FORCE RLS toggling.
// ----------------------------------------------------------------------

async function setForceRls(client: PrismaClient, enable: boolean): Promise<void> {
  const verb = enable ? 'FORCE' : 'NO FORCE';
  for (const table of FORCE_RLS_TABLES) {
    // ENABLE RLS is already set by the migration; FORCE applies enforcement
    // to table owners as well, which is what we want to simulate prod.
    await client.$executeRawUnsafe(
      `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
    );
    await client.$executeRawUnsafe(`ALTER TABLE ${table} ${verb} ROW LEVEL SECURITY`);
  }
}

// ----------------------------------------------------------------------
// Persona contexts.
// ----------------------------------------------------------------------

function makeCtx(opts: {
  userId: string | null;
  orgId: string | null;
  role: RlsRole;
  partnerId?: string | null;
}): GucContext {
  return {
    userId: opts.userId,
    orgId: opts.orgId,
    role: opts.role,
    partnerId: opts.partnerId ?? null,
  };
}

// ----------------------------------------------------------------------
// Main.
// ----------------------------------------------------------------------

async function main(): Promise<number> {
  const shadowUrl = process.env.SHADOW_DATABASE_URL;
  if (!shadowUrl) {
    console.error(
      '[force-rls] SHADOW_DATABASE_URL is not set. Aborting.\n' +
        '  Create a disposable shadow DB and set SHADOW_DATABASE_URL=postgres://...',
    );
    return 1;
  }
  assertNotProduction(shadowUrl);

  // Point Prisma at the shadow DB for both migrate and runtime.
  process.env.DATABASE_URL = shadowUrl;
  process.env.POSTGRES_PRISMA_URL = shadowUrl;
  process.env.POSTGRES_URL_NON_POOLING = shadowUrl;
  const prismaEnv = {
    ...process.env,
    DATABASE_URL: shadowUrl,
    POSTGRES_PRISMA_URL: shadowUrl,
    POSTGRES_URL_NON_POOLING: shadowUrl,
  };

  console.log('[force-rls] Syncing current Prisma schema to shadow DB...');
  try {
    runPrisma('npx prisma db push --accept-data-loss --skip-generate', prismaEnv);
    for (const migrationFile of RLS_POLICY_MIGRATIONS) {
      console.log(`[force-rls] Applying ${migrationFile}...`);
      runPrisma(`npx prisma db execute --schema prisma/schema.prisma --file ${migrationFile}`, prismaEnv);
    }
  } catch (err) {
    console.error('[force-rls] shadow schema/RLS setup failed:', err);
    return 1;
  }

  const client = new PrismaClient({ datasources: { db: { url: shadowUrl } } });

  // Apply the same GUC + transaction wiring used in lib/db/prisma.ts by
  // importing the singleton. We use a fresh client above only for setup
  // (so the migration's bypass for `system` role works cleanly). For the
  // persona assertions we use the *real* `prisma` export.
  const { prisma: realPrisma } = await import('../../lib/db/prisma');

  try {
    console.log('[force-rls] Seeding personas...');
    await seedPersonas(client);

    console.log('[force-rls] FORCE RLS enabled on:', FORCE_RLS_TABLES.join(', '));

    // -- Admin Org A --
    const adminACtx = makeCtx({
      userId: SEED.adminA,
      orgId: SEED.orgA,
      role: 'admin',
    });
    await assertCount(
      'Admin Org A',
      'can see Org A members (>=2)',
      adminACtx,
      (c) =>
        c.user
          .count({ where: { organizationId: SEED.orgA } })
          .then((n: number) => n),
      { gte: 2 },
      realPrisma,
    );
    await assertCount(
      'Admin Org A',
      'cannot see Org B members',
      adminACtx,
      (c) =>
        c.user
          .count({ where: { organizationId: SEED.orgB } })
          .then((n: number) => n),
      { eq: 0 },
      realPrisma,
    );

    // -- Counselor Org A --
    const counselorACtx = makeCtx({
      userId: SEED.counselorAUser,
      orgId: SEED.orgA,
      role: 'counselor',
    });
    await assertCount(
      'Counselor Org A',
      'can see assigned member m1',
      counselorACtx,
      (c) => c.user.count({ where: { id: SEED.memberM1 } }),
      { eq: 1 },
      realPrisma,
    );
    await assertCount(
      'Counselor Org A',
      'cannot see Org B member m2',
      counselorACtx,
      (c) => c.user.count({ where: { id: SEED.memberM2 } }),
      { eq: 0 },
      realPrisma,
    );

    // -- Member m1 --
    const memberM1Ctx = makeCtx({
      userId: SEED.memberM1,
      orgId: SEED.orgA,
      role: 'member',
    });
    await assertCount(
      'Member m1',
      'can read own profile',
      memberM1Ctx,
      (c) => c.profile.count({ where: { userId: SEED.memberM1 } }),
      { eq: 1 },
      realPrisma,
    );
    await assertCount(
      'Member m1',
      'cannot read m2 profile',
      memberM1Ctx,
      (c) => c.profile.count({ where: { userId: SEED.memberM2 } }),
      { eq: 0 },
      realPrisma,
    );
    await assertCount(
      'Member m1',
      'cannot list users in own org (only self)',
      memberM1Ctx,
      (c) => c.user.count({ where: { organizationId: SEED.orgA } }),
      { lte: 1 },
      realPrisma,
    );

    // -- Partner Org A --
    const partnerACtx = makeCtx({
      userId: SEED.partnerAUser,
      orgId: SEED.orgA,
      role: 'partner',
      partnerId: SEED.partnerARow,
    });
    await assertCount(
      'Partner Org A',
      'can see own referrals (member m1)',
      partnerACtx,
      (c) =>
        c.partnerReferral.count({
          where: { partnerId: SEED.partnerARow },
        }),
      { gte: 1 },
      realPrisma,
    );
    await assertCount(
      'Partner Org A',
      'cannot see Org B users',
      partnerACtx,
      (c) => c.user.count({ where: { organizationId: SEED.orgB } }),
      { eq: 0 },
      realPrisma,
    );

    // -- Anonymous --
    const anonCtx = makeCtx({ userId: null, orgId: null, role: 'anonymous' });
    await assertCount(
      'Anonymous',
      'cannot read any users',
      anonCtx,
      (c) => c.user.count(),
      { eq: 0 },
      realPrisma,
    );
    await assertCount(
      'Anonymous',
      'cannot read any profiles',
      anonCtx,
      (c) => c.profile.count(),
      { eq: 0 },
      realPrisma,
    );
  } finally {
    try {
      await setForceRls(client, false);
    } catch (err) {
      console.warn('[force-rls] failed to clear FORCE RLS:', err);
    }
    await client.$disconnect();
    await realPrisma.$disconnect();
  }

  // ----------------------------------------------------------------------
  // Markdown summary.
  // ----------------------------------------------------------------------

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  const lines: string[] = [];
  lines.push('# FORCE RLS Staging Rehearsal — Results');
  lines.push('');
  lines.push(`Total: **${total}**  |  Passed: **${passed}**  |  Failed: **${failed}**`);
  lines.push('');
  lines.push('## Tables under FORCE RLS');
  lines.push('');
  for (const t of FORCE_RLS_TABLES) lines.push(`- \`${t}\``);
  lines.push('');
  lines.push('## Persona-Test Results');
  lines.push('');
  lines.push('| Persona | Assertion | Result | Detail |');
  lines.push('|---|---|---|---|');
  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL';
    const detail = r.error ? r.error.replace(/\|/g, '\\|') : '';
    lines.push(`| ${r.persona} | ${r.description} | ${status} | ${detail} |`);
  }
  lines.push('');
  console.log('\n' + lines.join('\n'));

  return failed;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('[force-rls] Unhandled error:', err);
    process.exit(1);
  });
