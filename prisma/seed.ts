import { randomUUID } from 'crypto';
import { PrismaClient, ApplicationStatus } from '@prisma/client';
import { seedBlogPosts } from './seed-blog';
import { seedOnetCareerData } from './seed-onet-career';
import { seedOrganizationProgramCatalog } from '../lib/platform/seedProgramCatalog';
import { DEFAULT_BRAND_ACCENT } from '../lib/platform/brandColors';

const prisma = new PrismaClient();

async function ensureDefaultOrgId(): Promise<string> {
  await prisma.organization.upsert({
    where: { slug: 'workforceap' },
    create: {
      name: 'WorkforceAP',
      slug: 'workforceap',
      billingType: 'flat',
      plan: 'nonprofit',
      active: true,
      primaryColor: DEFAULT_BRAND_ACCENT,
    },
    update: {},
  });
  const row = await prisma.organization.findUniqueOrThrow({
    where: { slug: 'workforceap' },
    select: { id: true },
  });
  return row.id;
}

/** Dev/staging QA only — set SEED_TEST_ACCOUNTS=true. Supabase passwords (create users in Dashboard): TestWfAP2026! */

async function main() {
  const defaultOrgId = await ensureDefaultOrgId();

  const roles = ['member', 'admin', 'case_manager', 'counselor', 'partner', 'employer'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  console.log('Seeded roles:', roles);

  await seedOrganizationProgramCatalog(defaultOrgId);
  console.log('Seeded organization program catalog from static PROGRAMS list');

  await seedOnetCareerData(prisma);

  // Seed admin users (mabrown040 is super_admin for testing all portal views)
  const superAdminEmails = ['mabrown040@gmail.com'];
  for (const email of superAdminEmails) {
    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    if (user?.profile) {
      await prisma.profile.update({
        where: { userId: user.id },
        data: { role: 'super_admin' },
      });
      console.log('Set role=super_admin for', email);
      // Also create employer record so super_admin can test employer portal
      await prisma.employer.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          organizationId: defaultOrgId,
          userId: user.id,
          companyName: 'Demo Employer',
          contactName: user.fullName ?? 'Admin',
          contactEmail: email,
        },
      });
      console.log('Created employer for', email);
    }
  }
  // example.com — reserved documentation domain; not a real inbox (replaces a workforceap.org-looking seed).
  const adminEmails = ['admin-seed@example.com'];
  for (const email of adminEmails) {
    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    if (user?.profile) {
      await prisma.profile.update({
        where: { userId: user.id },
        data: { role: 'admin' },
      });
      console.log('Set role=admin for', email);
    }
  }

  await seedBlogPosts();
  // Seed initial partners
  const partnerSeeds = [
    { name: 'Workforce Solutions Capital Area', slug: 'workforce-solutions-austin', contactEmail: null },
    { name: 'Texas Workforce Commission', slug: 'twc', contactEmail: null },
    { name: 'Austin Area Urban League', slug: 'austin-urban-league', contactEmail: null },
    { name: 'African American Youth Harvest Foundation', slug: 'aayh-foundation', contactEmail: null },
    { name: '211 Texas', slug: '211-texas', contactEmail: null },
  ];
  for (const p of partnerSeeds) {
    await prisma.partner.upsert({
      where: { slug: p.slug },
      update: { referralCode: p.slug },
      create: { ...p, referralCode: p.slug, organizationId: defaultOrgId },
    });
  }
  console.log('Seeded partners:', partnerSeeds.length);

  const demoEmployerUser = await prisma.user.findUnique({
    where: { email: 'michael.brown@workforceap.org' },
    select: { id: true },
  });
  if (demoEmployerUser) {
    await prisma.employer.updateMany({
      where: { userId: demoEmployerUser.id },
      data: { tier: 'partner' },
    });
    console.log('Set employer tier=partner for michael.brown@workforceap.org (demo)');
  }

  if (process.env.SEED_TEST_ACCOUNTS === 'true') {
    const memberRole = await prisma.role.findUnique({ where: { name: 'member' } });
    const partnerRole = await prisma.role.findUnique({ where: { name: 'partner' } });
    const employerRole = await prisma.role.findUnique({ where: { name: 'employer' } });
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (!memberRole || !partnerRole || !employerRole || !adminRole) {
      console.warn('SEED_TEST_ACCOUNTS: missing roles, skipping test accounts');
    } else {
      const partnerOrg = await prisma.partner.findFirst({
        where: { slug: 'workforce-solutions-austin' },
        select: { id: true },
      });
      if (!partnerOrg) {
        console.warn('SEED_TEST_ACCOUNTS: partner org not found, skipping referral fixtures');
      }

      const memberTestId = randomUUID();
      await prisma.user.upsert({
        where: { email: 'member-test@workforceap.org' },
        create: {
          id: memberTestId,
          organizationId: defaultOrgId,
          email: 'member-test@workforceap.org',
          fullName: 'Portal QA Member',
          phone: '5125550100',
        },
        update: { fullName: 'Portal QA Member' },
      });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: memberTestId, roleId: memberRole.id } },
        create: { userId: memberTestId, roleId: memberRole.id },
        update: {},
      });
      await prisma.profile.upsert({
        where: { userId: memberTestId },
        create: { userId: memberTestId, zip: '78701', consentTerms: true },
        update: {},
      });
      await prisma.application.deleteMany({ where: { userId: memberTestId } });
      await prisma.application.create({
        data: {
          userId: memberTestId,
          status: ApplicationStatus.PENDING,
          programInterest: 'Not sure — help me choose',
          submittedAt: new Date(),
        },
      });

      const partnerTestId = randomUUID();
      await prisma.user.upsert({
        where: { email: 'partner-test@workforceap.org' },
        create: {
          id: partnerTestId,
          organizationId: defaultOrgId,
          email: 'partner-test@workforceap.org',
          fullName: 'Portal QA Partner',
          phone: '5125550101',
        },
        update: { fullName: 'Portal QA Partner' },
      });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: partnerTestId, roleId: partnerRole.id } },
        create: { userId: partnerTestId, roleId: partnerRole.id },
        update: {},
      });
      if (partnerOrg) {
        await prisma.partnerUser.upsert({
          where: { userId: partnerTestId },
          create: { partnerId: partnerOrg.id, userId: partnerTestId },
          update: { partnerId: partnerOrg.id },
        });
        const refA = randomUUID();
        const refB = randomUUID();
        await prisma.user.upsert({
          where: { email: 'referral-member-a@workforceap.org' },
          create: {
            id: refA,
            organizationId: defaultOrgId,
            email: 'referral-member-a@workforceap.org',
            fullName: 'Referral Member A',
          },
          update: {},
        });
        await prisma.user.upsert({
          where: { email: 'referral-member-b@workforceap.org' },
          create: {
            id: refB,
            organizationId: defaultOrgId,
            email: 'referral-member-b@workforceap.org',
            fullName: 'Referral Member B',
          },
          update: {},
        });
        await prisma.partnerReferral.upsert({
          where: { partnerId_memberId: { partnerId: partnerOrg.id, memberId: refA } },
          create: { partnerId: partnerOrg.id, memberId: refA },
          update: {},
        });
        await prisma.partnerReferral.upsert({
          where: { partnerId_memberId: { partnerId: partnerOrg.id, memberId: refB } },
          create: { partnerId: partnerOrg.id, memberId: refB },
          update: {},
        });
      }

      const employerTestId = randomUUID();
      await prisma.user.upsert({
        where: { email: 'employer-test@workforceap.org' },
        create: {
          id: employerTestId,
          organizationId: defaultOrgId,
          email: 'employer-test@workforceap.org',
          fullName: 'Portal QA Employer',
          phone: '5125550102',
        },
        update: { fullName: 'Portal QA Employer' },
      });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: employerTestId, roleId: employerRole.id } },
        create: { userId: employerTestId, roleId: employerRole.id },
        update: {},
      });
      const empRow = await prisma.employer.upsert({
        where: { userId: employerTestId },
        create: {
          organizationId: defaultOrgId,
          userId: employerTestId,
          companyName: 'QA Employer Co',
          contactName: 'Portal QA Employer',
          contactEmail: 'employer-test@workforceap.org',
          tier: 'basic',
        },
        update: { companyName: 'QA Employer Co' },
      });
      const matchMemberId = randomUUID();
      await prisma.user.upsert({
        where: { email: 'match-candidate@workforceap.org' },
        create: {
          id: matchMemberId,
          organizationId: defaultOrgId,
          email: 'match-candidate@workforceap.org',
          fullName: 'Match Candidate',
        },
        update: {},
      });
      await prisma.job.deleteMany({ where: { employerId: empRow.id, title: { startsWith: '[QA] ' } } });
      const j1 = await prisma.job.create({
        data: {
          organizationId: defaultOrgId,
          employerId: empRow.id,
          title: '[QA] Software Engineer',
          description: 'QA seed job for employer portal.',
          location: 'Austin, TX',
          status: 'live',
        },
      });
      const j2 = await prisma.job.create({
        data: {
          organizationId: defaultOrgId,
          employerId: empRow.id,
          title: '[QA] Data Analyst',
          description: 'QA seed job for employer portal.',
          location: 'Remote',
          status: 'live',
        },
      });
      await prisma.aIJobMatch.deleteMany({ where: { jobId: { in: [j1.id, j2.id] } } });
      await prisma.aIJobMatch.create({
        data: {
          jobId: j1.id,
          studentId: matchMemberId,
          matchScore: 88,
          matchReasons: ['QA seed'],
          status: 'suggested',
        },
      });
      await prisma.aIJobMatch.create({
        data: {
          jobId: j2.id,
          studentId: matchMemberId,
          matchScore: 72,
          matchReasons: ['QA seed'],
          status: 'contacted',
          statusUpdatedAt: new Date(),
        },
      });

      const adminTestId = randomUUID();
      await prisma.user.upsert({
        where: { email: 'admin-test@workforceap.org' },
        create: {
          id: adminTestId,
          organizationId: defaultOrgId,
          email: 'admin-test@workforceap.org',
          fullName: 'Portal QA Admin',
          phone: '5125550103',
        },
        update: { fullName: 'Portal QA Admin' },
      });
      await prisma.profile.upsert({
        where: { userId: adminTestId },
        create: { userId: adminTestId, zip: '78701', consentTerms: true, role: 'admin' },
        update: { role: 'admin' },
      });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: adminTestId, roleId: adminRole.id } },
        create: { userId: adminTestId, roleId: adminRole.id },
        update: {},
      });

      console.log('SEED_TEST_ACCOUNTS: created/updated portal QA rows (Supabase login: TestWfAP2026!)');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


