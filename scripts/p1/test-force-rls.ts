#!/usr/bin/env npx tsx
/**
 * Shadow or staging DB audit: temporarily FORCE ROW LEVEL SECURITY on all
 * RLS-enabled tables, run role × query fixtures, revert NO FORCE (unless
 * --no-revert), write Markdown report.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  buildGucContext,
  runWithGucContext,
  SYSTEM_GUC_CONTEXT,
  type GucContext,
  type RlsRole,
} from '../../lib/db/gucContext';
import { buildGucSql } from '../../lib/db/prisma';

const REPO_ROOT = path.resolve(__dirname, '../..');

type RunTarget = 'shadow' | 'staging';

interface CliOptions {
  target: RunTarget;
  extended: boolean;
  noRevert: boolean;
}

function parseCli(): CliOptions {
  const args = process.argv.slice(2);
  const targetArg = args.find((a) => a.startsWith('--target='))?.split('=')[1];
  const target: RunTarget =
    targetArg === 'staging' || targetArg === 'shadow'
      ? targetArg
      : process.env.P1_RLS_TARGET === 'staging'
        ? 'staging'
        : 'shadow';
  return {
    target,
    extended: args.includes('--extended') || process.env.P1_RLS_EXTENDED === '1',
    noRevert: args.includes('--no-revert') || process.env.P1_RLS_NO_REVERT === '1',
  };
}

function loadDotEnvFiles(): void {
  for (const name of ['.env', '.env.local']) {
    const filePath = path.join(REPO_ROOT, name);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      if (process.env[key] === undefined) {
        process.env[key] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

function normalizeDbUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.replace(/^postgres:/, 'postgresql:'));
    u.search = '';
    return u.toString();
  } catch {
    return url.trim();
  }
}

function supabaseProjectRef(url: string): string | null {
  try {
    const u = new URL(url.replace(/^postgres:/, 'postgresql:'));
    const user = decodeURIComponent(u.username);
    const m = user.match(/^postgres\.([a-z0-9]+)$/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function resolveDatabaseUrl(target: RunTarget): string | null {
  if (target === 'staging') {
    return (
      process.env.STAGING_DATABASE_URL?.trim() ||
      process.env.STAGING_POSTGRES_URL_NON_POOLING?.trim() ||
      null
    );
  }
  return (
    process.env.SHADOW_DATABASE_URL?.trim() ||
    process.env.SHADOW_POSTGRES_URL_NON_POOLING?.trim() ||
    null
  );
}

function assertSafeTarget(target: RunTarget, dbUrl: string): void {
  const prod = normalizeDbUrl(process.env.DATABASE_URL);
  const shadow = normalizeDbUrl(
    process.env.SHADOW_DATABASE_URL ?? process.env.SHADOW_POSTGRES_URL_NON_POOLING,
  );
  const staging = normalizeDbUrl(
    process.env.STAGING_DATABASE_URL ?? process.env.STAGING_POSTGRES_URL_NON_POOLING,
  );
  const dbNorm = normalizeDbUrl(dbUrl);

  if (prod && dbNorm && prod === dbNorm) {
    console.error('[test-force-rls] Refusing to run: target URL equals DATABASE_URL (production).');
    process.exit(1);
  }

  if (target === 'shadow') {
    if (shadow && dbNorm && shadow !== dbNorm) {
      console.error('[test-force-rls] Shadow target URL does not match SHADOW_DATABASE_URL.');
      process.exit(1);
    }
    if (staging && dbNorm && staging === dbNorm) {
      console.error('[test-force-rls] Refusing shadow run against STAGING_DATABASE_URL.');
      process.exit(1);
    }
  }

  if (target === 'staging') {
    if (!staging || staging !== dbNorm) {
      console.error('[test-force-rls] Staging run requires STAGING_DATABASE_URL to match the active target.');
      process.exit(1);
    }
    if (shadow && dbNorm && shadow === dbNorm) {
      console.error('[test-force-rls] Refusing staging run: STAGING_DATABASE_URL equals SHADOW_DATABASE_URL.');
      process.exit(1);
    }
    const prodRef = prod ? supabaseProjectRef(prod) : null;
    const stagingRef = supabaseProjectRef(dbUrl);
    if (prodRef && stagingRef && prodRef === stagingRef) {
      console.error(
        '[test-force-rls] Refusing staging run: Supabase project ref matches DATABASE_URL (production).',
      );
      process.exit(1);
    }
    if (shadow) {
      const shadowRef = supabaseProjectRef(shadow);
      if (shadowRef && stagingRef && shadowRef === stagingRef) {
        console.error(
          '[test-force-rls] Refusing staging run: Supabase project ref matches SHADOW_DATABASE_URL.',
        );
        process.exit(1);
      }
    }
    const host = new URL(dbUrl.replace(/^postgres:/, 'postgresql:')).hostname.toLowerCase();
    const looksStaging =
      host.includes('staging') ||
      process.env.P1_STAGING_HOST_CONFIRMED === '1' ||
      (process.env.P1_STAGING_PROJECT_REF?.trim() &&
        stagingRef === process.env.P1_STAGING_PROJECT_REF.trim());
    if (!looksStaging) {
      console.error(
        '[test-force-rls] Staging host guard failed. Set P1_STAGING_HOST_CONFIRMED=1 or P1_STAGING_PROJECT_REF if intentional.',
      );
      process.exit(1);
    }
  }
}

function createClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  });
}

type RlsTableRow = { table_name: string; relforcerowsecurity: boolean };

async function listRlsEnabledTables(client: PrismaClient): Promise<RlsTableRow[]> {
  return client.$queryRaw<RlsTableRow[]>`
    SELECT c.relname AS table_name, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
    ORDER BY c.relname
  `;
}

async function tableExists(client: PrismaClient, tableName: string): Promise<boolean> {
  const rows = await client.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function forceRls(client: PrismaClient, tables: string[]): Promise<void> {
  for (const table of tables) {
    const safe = table.replace(/"/g, '""');
    await client.$executeRawUnsafe(`ALTER TABLE "${safe}" FORCE ROW LEVEL SECURITY`);
  }
}

async function noForceRls(client: PrismaClient, tables: string[]): Promise<void> {
  for (const table of tables) {
    const safe = table.replace(/"/g, '""');
    await client.$executeRawUnsafe(`ALTER TABLE "${safe}" NO FORCE ROW LEVEL SECURITY`);
  }
}

interface FixtureIds {
  orgX: string;
  orgY: string;
  memberUserId: string;
  memberWithApplication: string | null;
  memberWithPlacement: string | null;
  adminXUserId: string;
  adminYUserId: string;
  counselorUserId: string | null;
  counselorMemberId: string | null;
  auditLogIdInOrgX: string | null;
  auditEventIdInOrgX: string | null;
  mentorSessionId: string | null;
  weeklyRecapUserId: string | null;
  employerXId: string | null;
  employerXUserId: string | null;
  jobIdInOrgX: string | null;
  jobIdInOrgY: string | null;
  employerYId: string | null;
  employerYUserId: string | null;
  coachMemoryTableExists: boolean;
  coachMemoryMemberId: string | null;
}

async function discoverFixtures(client: PrismaClient): Promise<FixtureIds> {
  let resolvedOrgX = process.env.P1_FIXTURE_ORG_X_ID?.trim();
  let resolvedOrgY = process.env.P1_FIXTURE_ORG_Y_ID?.trim();

  if (!resolvedOrgX || !resolvedOrgY) {
    const orgRows = await client.$queryRaw<{ organization_id: string; c: bigint }[]>`
      SELECT organization_id, COUNT(*)::bigint AS c
      FROM users
      WHERE organization_id IS NOT NULL
      GROUP BY organization_id
      HAVING COUNT(*) >= 2
      ORDER BY c DESC
      LIMIT 2
    `;
    if (orgRows.length < 2) {
      throw new Error(
        'Need at least two organizations with users (or set P1_FIXTURE_ORG_X_ID / P1_FIXTURE_ORG_Y_ID).',
      );
    }
    resolvedOrgX = resolvedOrgX ?? orgRows[0].organization_id;
    resolvedOrgY = resolvedOrgY ?? orgRows[1].organization_id;
  }

  if (resolvedOrgX === resolvedOrgY) {
    throw new Error('Fixture org X and Y must differ.');
  }

  const memberUserId =
    process.env.P1_FIXTURE_MEMBER_USER_ID?.trim() ??
    (
      await client.$queryRaw<{ id: string }[]>`
        SELECT u.id FROM users u
        JOIN profiles p ON p.user_id = u.id
        WHERE u.organization_id = ${resolvedOrgX}::text AND p.role = 'member'
        LIMIT 1
      `
    )[0]?.id;

  if (!memberUserId) throw new Error(`No member in org ${resolvedOrgX}`);

  const adminXUserId =
    process.env.P1_FIXTURE_ADMIN_X_USER_ID?.trim() ??
    (
      await client.$queryRaw<{ id: string }[]>`
        SELECT u.id FROM users u
        JOIN profiles p ON p.user_id = u.id
        WHERE u.organization_id = ${resolvedOrgX}::text AND p.role = 'admin'
        LIMIT 1
      `
    )[0]?.id;

  const adminYUserId =
    process.env.P1_FIXTURE_ADMIN_Y_USER_ID?.trim() ??
    (
      await client.$queryRaw<{ id: string }[]>`
        SELECT u.id FROM users u
        JOIN profiles p ON p.user_id = u.id
        WHERE u.organization_id = ${resolvedOrgY}::text AND p.role = 'admin'
        LIMIT 1
      `
    )[0]?.id;

  if (!adminXUserId || !adminYUserId) {
    throw new Error('Need admin users in both fixture orgs.');
  }

  const counselorRow = await client.$queryRaw<{ user_id: string; member_id: string }[]>`
    SELECT c.user_id, ca.member_id
    FROM counselors c
    JOIN counselor_assignments ca ON ca.counselor_id = c.id AND ca.active = true
    JOIN users m ON m.id = ca.member_id
    WHERE m.organization_id = ${resolvedOrgX}::text
    LIMIT 1
  `;

  const placementMemberId = counselorRow[0]?.member_id ?? memberUserId;
  const placementRow = await client.$queryRaw<{ user_id: string }[]>`
    SELECT user_id FROM placement_records WHERE user_id = ${placementMemberId}::text LIMIT 1
  `;

  const appRow = await client.$queryRaw<{ user_id: string }[]>`
    SELECT user_id FROM applications WHERE user_id = ${memberUserId}::text LIMIT 1
  `;

  const auditRow = await client.$queryRaw<{ id: string }[]>`
    SELECT al.id FROM audit_logs al
    JOIN users u ON u.id = al.actor_user_id
    WHERE u.organization_id = ${resolvedOrgX}::text
    LIMIT 1
  `;

  let auditEventIdInOrgX: string | null = null;
  if (await tableExists(client, 'audit_events')) {
    const auditEventRow = await client.$queryRaw<{ id: string }[]>`
      SELECT id FROM audit_events WHERE org_id = ${resolvedOrgX}::text LIMIT 1
    `;
    auditEventIdInOrgX = auditEventRow[0]?.id ?? null;
  }

  const mentorSessionRow = await client.$queryRaw<{ id: string }[]>`
    SELECT ms.id FROM mentor_sessions ms
    JOIN users m ON m.id = ms.member_id
    WHERE m.organization_id = ${resolvedOrgX}::text
    LIMIT 1
  `;

  const weeklyRecapRow = await client.$queryRaw<{ user_id: string }[]>`
    SELECT user_id FROM weekly_recaps WHERE user_id = ${memberUserId}::text LIMIT 1
  `;

  const employerXRow = await client.$queryRaw<{ id: string; user_id: string }[]>`
    SELECT id, user_id FROM employers WHERE organization_id = ${resolvedOrgX}::text LIMIT 1
  `;
  const employerYRow = await client.$queryRaw<{ id: string; user_id: string }[]>`
    SELECT id, user_id FROM employers WHERE organization_id = ${resolvedOrgY}::text LIMIT 1
  `;

  let jobIdInOrgX: string | null = null;
  let jobIdInOrgY: string | null = null;
  if (employerXRow[0]) {
    const jobX = await client.$queryRaw<{ id: string }[]>`
      SELECT id FROM jobs WHERE employer_id = ${employerXRow[0].id}::text LIMIT 1
    `;
    jobIdInOrgX = jobX[0]?.id ?? null;
  }
  if (employerYRow[0]) {
    const jobY = await client.$queryRaw<{ id: string }[]>`
      SELECT id FROM jobs WHERE employer_id = ${employerYRow[0].id}::text LIMIT 1
    `;
    jobIdInOrgY = jobY[0]?.id ?? null;
  }

  const coachMemoryTableExists = await tableExists(client, 'coach_memories');
  let coachMemoryMemberId: string | null = null;
  if (coachMemoryTableExists) {
    const cmRow = await client.$queryRaw<{ member_id: string }[]>`
      SELECT member_id FROM coach_memories LIMIT 1
    `;
    coachMemoryMemberId = cmRow[0]?.member_id ?? memberUserId;
  }

  return {
    orgX: resolvedOrgX,
    orgY: resolvedOrgY,
    memberUserId,
    memberWithApplication: appRow[0]?.user_id ?? null,
    memberWithPlacement: placementRow[0]?.user_id ?? null,
    adminXUserId,
    adminYUserId,
    counselorUserId: counselorRow[0]?.user_id ?? null,
    counselorMemberId: counselorRow[0]?.member_id ?? null,
    auditLogIdInOrgX: auditRow[0]?.id ?? null,
    auditEventIdInOrgX,
    mentorSessionId: mentorSessionRow[0]?.id ?? null,
    weeklyRecapUserId: weeklyRecapRow[0]?.user_id ?? null,
    employerXId: employerXRow[0]?.id ?? null,
    employerXUserId: employerXRow[0]?.user_id ?? null,
    jobIdInOrgX,
    jobIdInOrgY,
    employerYId: employerYRow[0]?.id ?? null,
    employerYUserId: employerYRow[0]?.user_id ?? null,
    coachMemoryTableExists,
    coachMemoryMemberId,
  };
}

function roleContext(
  role: RlsRole,
  userId: string | null,
  orgId: string | null,
  extras?: { employerId?: string | null; partnerId?: string | null },
): GucContext {
  return buildGucContext({
    userId,
    orgId,
    profileRole: role,
    employerId: extras?.employerId,
    partnerId: extras?.partnerId,
  });
}

interface TestCase {
  roleLabel: string;
  table: string;
  queryLabel: string;
  kind: 'read' | 'write';
  expectAllowed: boolean;
  minRows?: number;
  ctx: GucContext;
  run: (tx: PrismaClient) => Promise<{ rowCount: number }>;
  skipReason?: string;
}

function buildBaseTestCases(f: FixtureIds): TestCase[] {
  const cases: TestCase[] = [
    {
      roleLabel: 'anonymous',
      table: 'users',
      queryLabel: 'select_any_user',
      kind: 'read',
      expectAllowed: false,
      ctx: roleContext('anonymous', null, null),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*)::bigint AS c FROM users`;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
    {
      roleLabel: 'member (orgId=X)',
      table: 'users',
      queryLabel: 'select_self',
      kind: 'read',
      expectAllowed: true,
      ctx: roleContext('member', f.memberUserId, f.orgX),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM users WHERE id = ${f.memberUserId}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
    {
      roleLabel: 'member (orgId=X)',
      table: 'users',
      queryLabel: 'select_other_member_in_org',
      kind: 'read',
      expectAllowed: false,
      ctx: roleContext('member', f.memberUserId, f.orgX),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM users
          WHERE organization_id = ${f.orgX}::text AND id <> ${f.memberUserId}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
    {
      roleLabel: 'admin (orgId=X)',
      table: 'users',
      queryLabel: 'select_org_roster',
      kind: 'read',
      expectAllowed: true,
      ctx: roleContext('admin', f.adminXUserId, f.orgX),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM users WHERE organization_id = ${f.orgX}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
    {
      roleLabel: 'admin (orgId=Y)',
      table: 'users',
      queryLabel: 'select_other_org_roster',
      kind: 'read',
      expectAllowed: false,
      ctx: roleContext('admin', f.adminYUserId, f.orgY),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM users WHERE organization_id = ${f.orgX}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
    {
      roleLabel: 'anonymous',
      table: 'organizations',
      queryLabel: 'select_org_x',
      kind: 'read',
      expectAllowed: false,
      ctx: roleContext('anonymous', null, null),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM organizations WHERE id = ${f.orgX}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
    {
      roleLabel: 'member (orgId=X)',
      table: 'organizations',
      queryLabel: 'select_own_org',
      kind: 'read',
      expectAllowed: true,
      ctx: roleContext('member', f.memberUserId, f.orgX),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM organizations WHERE id = ${f.orgX}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
    {
      roleLabel: 'admin (orgId=Y)',
      table: 'organizations',
      queryLabel: 'select_org_x',
      kind: 'read',
      expectAllowed: false,
      ctx: roleContext('admin', f.adminYUserId, f.orgY),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM organizations WHERE id = ${f.orgX}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
    {
      roleLabel: 'member (orgId=X)',
      table: 'users',
      queryLabel: 'update_self_noop',
      kind: 'write',
      expectAllowed: true,
      ctx: roleContext('member', f.memberUserId, f.orgX),
      run: async (tx) => {
        const n = await tx.$executeRaw`
          UPDATE users SET updated_at = updated_at WHERE id = ${f.memberUserId}::text
        `;
        return { rowCount: n };
      },
    },
    {
      roleLabel: 'admin (orgId=Y)',
      table: 'users',
      queryLabel: 'update_member_in_org_x',
      kind: 'write',
      expectAllowed: false,
      ctx: roleContext('admin', f.adminYUserId, f.orgY),
      run: async (tx) => {
        const n = await tx.$executeRaw`
          UPDATE users SET updated_at = updated_at WHERE id = ${f.memberUserId}::text
        `;
        return { rowCount: n };
      },
    },
  ];

  if (f.memberWithApplication) {
    cases.push(
      {
        roleLabel: 'member (orgId=X)',
        table: 'applications',
        queryLabel: 'select_own',
        kind: 'read',
        expectAllowed: true,
        ctx: roleContext('member', f.memberUserId, f.orgX),
        run: async (tx) => {
          const r = await tx.$queryRaw<{ c: bigint }[]>`
            SELECT COUNT(*)::bigint AS c FROM applications WHERE user_id = ${f.memberUserId}::text
          `;
          return { rowCount: Number(r[0]?.c ?? 0) };
        },
      },
      {
        roleLabel: 'admin (orgId=Y)',
        table: 'applications',
        queryLabel: 'select_member_in_org_x',
        kind: 'read',
        expectAllowed: false,
        ctx: roleContext('admin', f.adminYUserId, f.orgY),
        run: async (tx) => {
          const r = await tx.$queryRaw<{ c: bigint }[]>`
            SELECT COUNT(*)::bigint AS c FROM applications WHERE user_id = ${f.memberUserId}::text
          `;
          return { rowCount: Number(r[0]?.c ?? 0) };
        },
      },
    );
  }

  const placementMember = f.counselorMemberId ?? f.memberWithPlacement ?? f.memberUserId;
  cases.push(
    {
      roleLabel: 'counselor (orgId=X)',
      table: 'placement_records',
      queryLabel: 'select_assigned_member',
      kind: 'read',
      expectAllowed: true,
      minRows: 1,
      ctx: roleContext('counselor', f.counselorUserId, f.orgX),
      skipReason: !f.counselorUserId
        ? 'no counselor assignment in org X'
        : !f.memberWithPlacement
          ? 'no placement_records for assigned member'
          : undefined,
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM placement_records WHERE user_id = ${placementMember}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
    {
      roleLabel: 'admin (orgId=Y)',
      table: 'placement_records',
      queryLabel: 'select_member_in_org_x',
      kind: 'read',
      expectAllowed: false,
      ctx: roleContext('admin', f.adminYUserId, f.orgY),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM placement_records WHERE user_id = ${placementMember}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
  );

  if (f.auditLogIdInOrgX) {
    cases.push(
      {
        roleLabel: 'admin (orgId=X)',
        table: 'audit_logs',
        queryLabel: 'select_org_actor_log',
        kind: 'read',
        expectAllowed: true,
        ctx: roleContext('admin', f.adminXUserId, f.orgX),
        run: async (tx) => {
          const r = await tx.$queryRaw<{ c: bigint }[]>`
            SELECT COUNT(*)::bigint AS c FROM audit_logs WHERE id = ${f.auditLogIdInOrgX}::text
          `;
          return { rowCount: Number(r[0]?.c ?? 0) };
        },
      },
      {
        roleLabel: 'admin (orgId=Y)',
        table: 'audit_logs',
        queryLabel: 'select_org_x_actor_log',
        kind: 'read',
        expectAllowed: false,
        ctx: roleContext('admin', f.adminYUserId, f.orgY),
        run: async (tx) => {
          const r = await tx.$queryRaw<{ c: bigint }[]>`
            SELECT COUNT(*)::bigint AS c FROM audit_logs WHERE id = ${f.auditLogIdInOrgX}::text
          `;
          return { rowCount: Number(r[0]?.c ?? 0) };
        },
      },
    );
  }

  return cases;
}

function buildExtendedTestCases(f: FixtureIds): TestCase[] {
  const cases: TestCase[] = [];

  // system role (cron / withCronLogging)
  cases.push(
    {
      roleLabel: 'system (cron)',
      table: 'weekly_recaps',
      queryLabel: 'select_member_recap',
      kind: 'read',
      expectAllowed: true,
      ctx: SYSTEM_GUC_CONTEXT,
      skipReason: !f.weeklyRecapUserId ? 'no weekly_recaps row for fixture member' : undefined,
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM weekly_recaps WHERE user_id = ${f.weeklyRecapUserId!}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
    {
      roleLabel: 'system (cron)',
      table: 'mentor_sessions',
      queryLabel: 'select_org_x_session',
      kind: 'read',
      expectAllowed: true,
      ctx: SYSTEM_GUC_CONTEXT,
      skipReason: !f.mentorSessionId ? 'no mentor_sessions in org X' : undefined,
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM mentor_sessions WHERE id = ${f.mentorSessionId!}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
  );

  // sub-agent / forwarded GUC contexts (wrong orgId on admin)
  cases.push(
    {
      roleLabel: 'sub-agent (admin orgId mismatch)',
      table: 'users',
      queryLabel: 'select_org_x_roster_wrong_org_guc',
      kind: 'read',
      expectAllowed: false,
      ctx: roleContext('admin', f.adminXUserId, f.orgY),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM users WHERE organization_id = ${f.orgX}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
    {
      roleLabel: 'sub-agent (admin null orgId)',
      table: 'users',
      queryLabel: 'select_org_x_roster_null_org',
      kind: 'read',
      expectAllowed: false,
      ctx: roleContext('admin', f.adminXUserId, null),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM users WHERE organization_id = ${f.orgX}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
    {
      roleLabel: 'sub-agent (member wrong orgId)',
      table: 'organizations',
      queryLabel: 'select_org_x_with_org_y_guc',
      kind: 'read',
      expectAllowed: false,
      ctx: roleContext('member', f.memberUserId, f.orgY),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM organizations WHERE id = ${f.orgX}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    },
  );

  // multi-account discord routing → per-org employer GUC isolation
  if (f.employerXId && f.employerXUserId && f.jobIdInOrgX) {
    cases.push(
      {
        roleLabel: 'employer account (org X)',
        table: 'jobs',
        queryLabel: 'select_own_job',
        kind: 'read',
        expectAllowed: true,
        ctx: roleContext('employer', f.employerXUserId, f.orgX, { employerId: f.employerXId }),
        run: async (tx) => {
          const r = await tx.$queryRaw<{ c: bigint }[]>`
            SELECT COUNT(*)::bigint AS c FROM jobs WHERE id = ${f.jobIdInOrgX!}::text
          `;
          return { rowCount: Number(r[0]?.c ?? 0) };
        },
      },
      {
        roleLabel: 'employer account (org X)',
        table: 'jobs',
        queryLabel: 'select_other_org_job',
        kind: 'read',
        expectAllowed: false,
        ctx: roleContext('employer', f.employerXUserId, f.orgX, { employerId: f.employerXId }),
        skipReason: !f.jobIdInOrgY ? 'no job in org Y' : undefined,
        run: async (tx) => {
          const r = await tx.$queryRaw<{ c: bigint }[]>`
            SELECT COUNT(*)::bigint AS c FROM jobs WHERE id = ${f.jobIdInOrgY!}::text
          `;
          return { rowCount: Number(r[0]?.c ?? 0) };
        },
      },
    );
  }

  if (f.employerYId && f.employerYUserId && f.jobIdInOrgY && f.jobIdInOrgX) {
    cases.push({
      roleLabel: 'employer account (org Y)',
      table: 'jobs',
      queryLabel: 'select_org_x_job_from_org_y',
      kind: 'read',
      expectAllowed: false,
      ctx: roleContext('employer', f.employerYUserId, f.orgY, { employerId: f.employerYId }),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM jobs WHERE id = ${f.jobIdInOrgX!}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    });
  }

  // audit_events (p1/audit-log)
  if (f.auditEventIdInOrgX) {
    cases.push(
      {
        roleLabel: 'admin (orgId=X)',
        table: 'audit_events',
        queryLabel: 'select_org_event',
        kind: 'read',
        expectAllowed: true,
        ctx: roleContext('admin', f.adminXUserId, f.orgX),
        run: async (tx) => {
          const r = await tx.$queryRaw<{ c: bigint }[]>`
            SELECT COUNT(*)::bigint AS c FROM audit_events WHERE id = ${f.auditEventIdInOrgX}::text
          `;
          return { rowCount: Number(r[0]?.c ?? 0) };
        },
      },
      {
        roleLabel: 'admin (orgId=Y)',
        table: 'audit_events',
        queryLabel: 'select_org_x_event',
        kind: 'read',
        expectAllowed: false,
        ctx: roleContext('admin', f.adminYUserId, f.orgY),
        run: async (tx) => {
          const r = await tx.$queryRaw<{ c: bigint }[]>`
            SELECT COUNT(*)::bigint AS c FROM audit_events WHERE id = ${f.auditEventIdInOrgX}::text
          `;
          return { rowCount: Number(r[0]?.c ?? 0) };
        },
      },
    );
  }

  // CoachMemory (r2) — optional table
  if (f.coachMemoryTableExists && f.coachMemoryMemberId) {
    cases.push(
      {
        roleLabel: 'member (orgId=X)',
        table: 'coach_memories',
        queryLabel: 'select_own_memory',
        kind: 'read',
        expectAllowed: true,
        ctx: roleContext('member', f.coachMemoryMemberId, f.orgX),
        run: async (tx) => {
          const r = await tx.$queryRaw<{ c: bigint }[]>`
            SELECT COUNT(*)::bigint AS c FROM coach_memories WHERE member_id = ${f.coachMemoryMemberId!}::text
          `;
          return { rowCount: Number(r[0]?.c ?? 0) };
        },
      },
      {
        roleLabel: 'admin (orgId=Y)',
        table: 'coach_memories',
        queryLabel: 'select_org_x_member_memory',
        kind: 'read',
        expectAllowed: false,
        ctx: roleContext('admin', f.adminYUserId, f.orgY),
        run: async (tx) => {
          const r = await tx.$queryRaw<{ c: bigint }[]>`
            SELECT COUNT(*)::bigint AS c FROM coach_memories WHERE member_id = ${f.coachMemoryMemberId!}::text
          `;
          return { rowCount: Number(r[0]?.c ?? 0) };
        },
      },
    );
  }

  // mentor_sessions counselor path (cron-adjacent session reads)
  if (f.mentorSessionId && f.counselorUserId) {
    cases.push({
      roleLabel: 'counselor (orgId=X)',
      table: 'mentor_sessions',
      queryLabel: 'select_assigned_session',
      kind: 'read',
      expectAllowed: true,
      ctx: roleContext('counselor', f.counselorUserId, f.orgX),
      run: async (tx) => {
        const r = await tx.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM mentor_sessions WHERE id = ${f.mentorSessionId!}::text
        `;
        return { rowCount: Number(r[0]?.c ?? 0) };
      },
    });
  }

  return cases;
}

function buildTestCases(f: FixtureIds, extended: boolean): TestCase[] {
  const cases = buildBaseTestCases(f);
  if (extended) {
    cases.push(...buildExtendedTestCases(f));
  }
  return cases;
}

async function runWithGucTransaction<T>(
  client: PrismaClient,
  ctx: GucContext,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return runWithGucContext(ctx, () =>
    client.$transaction(async (tx) => {
      await (tx as PrismaClient).$executeRawUnsafe(buildGucSql(ctx));
      return fn(tx as PrismaClient);
    }),
  );
}

interface TestResult {
  roleLabel: string;
  table: string;
  queryLabel: string;
  kind: string;
  expectAllowed: boolean;
  pass: boolean;
  rowCount: number | null;
  error: string | null;
  skipped: boolean;
}

async function runTestCase(client: PrismaClient, test: TestCase): Promise<TestResult> {
  if (test.skipReason) {
    return {
      roleLabel: test.roleLabel,
      table: test.table,
      queryLabel: test.queryLabel,
      kind: test.kind,
      expectAllowed: test.expectAllowed,
      pass: true,
      rowCount: null,
      error: null,
      skipped: true,
    };
  }

  try {
    const { rowCount } = await runWithGucTransaction(client, test.ctx, test.run);
    const minRows = test.minRows ?? 1;
    const pass = test.expectAllowed ? rowCount >= minRows : rowCount === 0;
    return {
      roleLabel: test.roleLabel,
      table: test.table,
      queryLabel: test.queryLabel,
      kind: test.kind,
      expectAllowed: test.expectAllowed,
      pass,
      rowCount,
      error: null,
      skipped: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      roleLabel: test.roleLabel,
      table: test.table,
      queryLabel: test.queryLabel,
      kind: test.kind,
      expectAllowed: test.expectAllowed,
      pass: !test.expectAllowed,
      rowCount: null,
      error: message,
      skipped: false,
    };
  }
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function reportSubdir(target: RunTarget): string {
  return target === 'staging' ? 'rehearsals' : 'audits';
}

function reportBasename(target: RunTarget): string {
  return target === 'staging'
    ? `p1-force-rls-staging-${todayStamp()}.md`
    : `p1-force-rls-shadow-results-${todayStamp()}.md`;
}

function emptyFixtures(): FixtureIds {
  return {
    orgX: '',
    orgY: '',
    memberUserId: '',
    memberWithApplication: null,
    memberWithPlacement: null,
    adminXUserId: '',
    adminYUserId: '',
    counselorUserId: null,
    counselorMemberId: null,
    auditLogIdInOrgX: null,
    auditEventIdInOrgX: null,
    mentorSessionId: null,
    weeklyRecapUserId: null,
    employerXId: null,
    employerXUserId: null,
    jobIdInOrgX: null,
    jobIdInOrgY: null,
    employerYId: null,
    employerYUserId: null,
    coachMemoryTableExists: false,
    coachMemoryMemberId: null,
  };
}

function writeReport(opts: {
  target: RunTarget;
  dbHost: string;
  tablesForced: string[];
  fixtures: FixtureIds;
  results: TestResult[];
  startedAt: string;
  finishedAt: string;
  runError: string | null;
  extended: boolean;
  keptForce: boolean;
}): string {
  const outPath = path.join(REPO_ROOT, 'docs', reportSubdir(opts.target), reportBasename(opts.target));
  const title =
    opts.target === 'staging' ? '# P1 FORCE RLS — Staging Rehearsal' : '# P1 FORCE RLS — Shadow Results';

  const passed = opts.results.filter((r) => r.pass && !r.skipped).length;
  const failed = opts.results.filter((r) => !r.pass && !r.skipped).length;
  const skipped = opts.results.filter((r) => r.skipped).length;
  const verdict = opts.runError ? 'NOT_RUN' : failed === 0 ? 'PASS' : 'FAIL';

  const lines: string[] = [
    title,
    '',
    `**Generated:** ${opts.finishedAt}`,
    `**Target:** ${opts.target}`,
    `**Database host:** \`${opts.dbHost}\``,
    `**Verdict:** ${verdict}`,
    `**Extended fixtures:** ${opts.extended ? 'yes' : 'no'}`,
    `**FORCE retained after run:** ${opts.keptForce ? 'yes (--no-revert)' : 'no (reverted)'}`,
    '',
    '## Run metadata',
    '',
    `- Started: ${opts.startedAt}`,
    `- Finished: ${opts.finishedAt}`,
    `- Tables FORCE-applied: ${opts.tablesForced.length}`,
    `- Fixture org X: \`${opts.fixtures.orgX || '(not discovered)'}\``,
    `- Fixture org Y: \`${opts.fixtures.orgY || '(not discovered)'}\``,
    `- coach_memories present: ${opts.fixtures.coachMemoryTableExists ? 'yes' : 'no'}`,
    '',
  ];

  if (opts.runError) {
    lines.push('## Run error', '', '```', opts.runError, '```', '');
  }

  lines.push(
    '## Summary',
    '',
    '| Passed | Failed | Skipped |',
    '|--------|--------|---------|',
    `| ${passed} | ${failed} | ${skipped} |`,
    '',
    '## Results (role × query × table)',
    '',
    '| Role | Table | Query | Kind | Expected | Rows | Pass | Notes |',
    '|------|-------|-------|------|----------|------|------|-------|',
  );

  for (const r of opts.results) {
    const expected = r.expectAllowed ? 'allow' : 'deny';
    const pass = r.skipped ? 'SKIP' : r.pass ? 'PASS' : 'FAIL';
    const rows = r.rowCount === null ? '—' : String(r.rowCount);
    const notes = r.skipped ? 'skipped' : r.error ? r.error.slice(0, 80) : '';
    lines.push(
      `| ${r.roleLabel} | ${r.table} | ${r.queryLabel} | ${r.kind} | ${expected} | ${rows} | ${pass} | ${notes.replace(/\|/g, '\\|')} |`,
    );
  }

  lines.push('', '---', '', '_Script: `scripts/p1/test-force-rls.ts`_', '');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'));
  return outPath;
}

async function main(): Promise<void> {
  const cli = parseCli();
  loadDotEnvFiles();

  const dbUrl = resolveDatabaseUrl(cli.target);
  const envVarName = cli.target === 'staging' ? 'STAGING_DATABASE_URL' : 'SHADOW_DATABASE_URL';

  if (!dbUrl) {
    const msg = `${envVarName} is required. See scripts/p1/README.md.`;
    console.error(`[test-force-rls] ${msg}`);
    const reportPath = writeReport({
      target: cli.target,
      dbHost: '(not configured)',
      tablesForced: [],
      fixtures: emptyFixtures(),
      results: [],
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      runError: msg,
      extended: cli.extended,
      keptForce: false,
    });
    console.error(`[test-force-rls] Report: ${reportPath}`);
    process.exit(1);
  }

  assertSafeTarget(cli.target, dbUrl);

  let dbHost = 'unknown';
  try {
    dbHost = new URL(dbUrl.replace(/^postgres:/, 'postgresql:')).hostname;
  } catch {
    /* ignore */
  }

  const startedAt = new Date().toISOString();
  const client = createClient(dbUrl);
  let tablesForced: string[] = [];
  let fixtures = emptyFixtures();
  let results: TestResult[] = [];
  let runError: string | null = null;

  try {
    console.log(`[test-force-rls] Connecting (${cli.target}, ${dbHost})…`);
    const rlsTables = await listRlsEnabledTables(client);
    tablesForced = rlsTables.map((t) => t.table_name);
    console.log(`[test-force-rls] ${tablesForced.length} tables with RLS enabled`);

    fixtures = await discoverFixtures(client);
    console.log(`[test-force-rls] Fixtures orgX=${fixtures.orgX} orgY=${fixtures.orgY}`);

    await forceRls(client, tablesForced);
    console.log('[test-force-rls] FORCE applied; running fixtures…');

    for (const testCase of buildTestCases(fixtures, cli.extended)) {
      const result = await runTestCase(client, testCase);
      results.push(result);
      const mark = result.skipped ? 'SKIP' : result.pass ? 'PASS' : 'FAIL';
      console.log(`  [${mark}] ${result.roleLabel} | ${result.table} | ${result.queryLabel}`);
    }
  } catch (err) {
    runError = err instanceof Error ? err.message : String(err);
    console.error('[test-force-rls] Error:', runError);
  } finally {
    if (tablesForced.length > 0 && !cli.noRevert) {
      console.log('[test-force-rls] Reverting NO FORCE…');
      try {
        await noForceRls(client, tablesForced);
      } catch (revertErr) {
        const msg = revertErr instanceof Error ? revertErr.message : String(revertErr);
        runError = runError ? `${runError}; revert: ${msg}` : `revert: ${msg}`;
      }
    } else if (cli.noRevert && tablesForced.length > 0) {
      console.log('[test-force-rls] --no-revert: FORCE ROW LEVEL SECURITY left applied.');
    }
    await client.$disconnect();
  }

  const reportPath = writeReport({
    target: cli.target,
    dbHost,
    tablesForced,
    fixtures,
    results,
    startedAt,
    finishedAt: new Date().toISOString(),
    runError,
    extended: cli.extended,
    keptForce: cli.noRevert && tablesForced.length > 0,
  });
  console.log(`[test-force-rls] Report: ${reportPath}`);

  if (runError || results.some((r) => !r.pass && !r.skipped)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
