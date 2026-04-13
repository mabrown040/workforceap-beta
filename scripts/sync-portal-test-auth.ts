#!/usr/bin/env npx tsx
/**
 * Creates Supabase Auth users for portal QA accounts and re-seeds Prisma rows
 * so `User.id` matches `auth.users.id` (required for /dashboard, /employer, etc.).
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL (or POSTGRES_*)
 *
 * Run: node scripts/prisma-env.js npx tsx scripts/sync-portal-test-auth.ts
 *
 * Password for all QA accounts: TestWfAP2026!
 */
import { randomUUID } from 'crypto';
import { PrismaClient, ApplicationStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { getDefaultOrganizationId } from '../lib/tenant/organization';

const PASSWORD = 'TestWfAP2026!';

const QA_EMAILS = [
  'member-test@workforceap.org',
  'partner-test@workforceap.org',
  'employer-test@workforceap.org',
  'admin-test@workforceap.org',
  'referral-member-a@workforceap.org',
  'referral-member-b@workforceap.org',
  'match-candidate@workforceap.org',
];

const prisma = new PrismaClient();

async function ensureAuthUser(email: string, fullName: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  }
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (!createErr && created.user) {
    console.log(`Auth: created ${email}`);
    return created.user.id;
  }

  if (
    createErr &&
    (createErr.message.includes('already been registered') ||
      createErr.message.includes('already exists') ||
      (createErr as { code?: string }).code === 'email_exists')
  ) {
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (listErr) throw new Error(`listUsers: ${listErr.message}`);
    const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) throw new Error(`Could not find existing auth user for ${email}`);

    const { error: updErr } = await supabase.auth.admin.updateUserById(found.id, {
      password: PASSWORD,
      user_metadata: { full_name: fullName },
    });
    if (updErr) console.warn(`Auth: password update for ${email}: ${updErr.message}`);
    else console.log(`Auth: updated password for ${email}`);
    return found.id;
  }

  throw new Error(`createUser ${email}: ${createErr?.message ?? 'unknown'}`);
}

async function removeExistingQaRows() {
  const users = await prisma.user.findMany({
    where: { email: { in: QA_EMAILS } },
    select: { id: true, email: true },
  });
  for (const u of users) {
    await prisma.user.delete({ where: { id: u.id } }).catch((e) => {
      console.warn(`Delete ${u.email}:`, (e as Error).message);
    });
  }
  console.log('Prisma: removed prior QA user rows (if any)');
}

async function seedQaWithAuthIds(
  orgId: string,
  ids: {
    member: string;
    partner: string;
    employer: string;
    admin: string;
  }
) {
  const memberRole = await prisma.role.findUniqueOrThrow({ where: { name: 'member' } });
  const partnerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'partner' } });
  const employerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'employer' } });
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });

  const partnerOrg = await prisma.partner.findFirst({
    where: { slug: 'workforce-solutions-austin' },
    select: { id: true },
  });

  await prisma.user.create({
    data: {
      id: ids.member,
      organizationId: orgId,
      email: 'member-test@workforceap.org',
      fullName: 'Portal QA Member',
      phone: '5125550100',
      userRoles: { create: { roleId: memberRole.id } },
      profile: { create: { zip: '78701', consentTerms: true } },
      applications: {
        create: {
          status: ApplicationStatus.PENDING,
          programInterest: 'Not sure — help me choose',
          submittedAt: new Date(),
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: ids.partner,
      organizationId: orgId,
      email: 'partner-test@workforceap.org',
      fullName: 'Portal QA Partner',
      phone: '5125550101',
      userRoles: { create: { roleId: partnerRole.id } },
      profile: { create: { consentTerms: true } },
      ...(partnerOrg
        ? {
            partnerUser: {
              create: { partnerId: partnerOrg.id },
            },
          }
        : {}),
    },
  });

  const refA = randomUUID();
  const refB = randomUUID();
  await prisma.user.create({
    data: {
      id: refA,
      organizationId: orgId,
      email: 'referral-member-a@workforceap.org',
      fullName: 'Referral Member A',
    },
  });
  await prisma.user.create({
    data: {
      id: refB,
      organizationId: orgId,
      email: 'referral-member-b@workforceap.org',
      fullName: 'Referral Member B',
    },
  });
  if (partnerOrg) {
    await prisma.partnerReferral.createMany({
      data: [
        { partnerId: partnerOrg.id, memberId: refA },
        { partnerId: partnerOrg.id, memberId: refB },
      ],
      skipDuplicates: true,
    });
  }

  const matchMemberId = randomUUID();
  await prisma.user.create({
    data: {
      id: matchMemberId,
      organizationId: orgId,
      email: 'match-candidate@workforceap.org',
      fullName: 'Match Candidate',
    },
  });

  await prisma.user.create({
    data: {
      id: ids.employer,
      organizationId: orgId,
      email: 'employer-test@workforceap.org',
      fullName: 'Portal QA Employer',
      phone: '5125550102',
      userRoles: { create: { roleId: employerRole.id } },
      profile: { create: { consentTerms: true } },
      employer: {
        create: {
          organizationId: orgId,
          companyName: 'QA Employer Co',
          contactName: 'Portal QA Employer',
          contactEmail: 'employer-test@workforceap.org',
          tier: 'basic',
          jobs: {
            create: [
              {
                organizationId: orgId,
                title: '[QA] Software Engineer',
                description: 'QA seed job for employer portal.',
                location: 'Austin, TX',
                status: 'live',
              },
              {
                organizationId: orgId,
                title: '[QA] Data Analyst',
                description: 'QA seed job for employer portal.',
                location: 'Remote',
                status: 'live',
              },
            ],
          },
        },
      },
    },
  });

  const emp = await prisma.employer.findUniqueOrThrow({
    where: { userId: ids.employer },
    include: { jobs: true },
  });
  const jobs = emp.jobs.filter((j) => j.title.startsWith('[QA]'));
  for (const j of jobs) {
    await prisma.aIJobMatch.createMany({
      data: [
        {
          jobId: j.id,
          studentId: matchMemberId,
          matchScore: j.title.includes('Software') ? 88 : 72,
          matchReasons: ['QA seed'],
          status: j.title.includes('Software') ? 'suggested' : 'contacted',
          ...(j.title.includes('Data') ? { statusUpdatedAt: new Date() } : {}),
        },
      ],
    });
  }

  await prisma.user.create({
    data: {
      id: ids.admin,
      organizationId: orgId,
      email: 'admin-test@workforceap.org',
      fullName: 'Portal QA Admin',
      phone: '5125550103',
      userRoles: { create: { roleId: adminRole.id } },
      profile: { create: { zip: '78701', consentTerms: true, role: 'admin' } },
    },
  });

  console.log('Prisma: QA portal users + employer fixtures created with Supabase-aligned ids');
}

async function main() {
  const orgId = await getDefaultOrganizationId();

  const memberId = await ensureAuthUser('member-test@workforceap.org', 'Portal QA Member');
  const partnerId = await ensureAuthUser('partner-test@workforceap.org', 'Portal QA Partner');
  const employerId = await ensureAuthUser('employer-test@workforceap.org', 'Portal QA Employer');
  const adminId = await ensureAuthUser('admin-test@workforceap.org', 'Portal QA Admin');

  await removeExistingQaRows();
  await seedQaWithAuthIds(orgId, {
    member: memberId,
    partner: partnerId,
    employer: employerId,
    admin: adminId,
  });

  console.log('');
  console.log('Done. Sign in at /login with any of:');
  console.log('  member-test@workforceap.org');
  console.log('  partner-test@workforceap.org');
  console.log('  employer-test@workforceap.org');
  console.log('  admin-test@workforceap.org');
  console.log(`Password: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
