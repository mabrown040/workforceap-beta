import { randomUUID } from 'crypto';
import { PrismaClient, ApplicationStatus } from '@prisma/client';
import { seedBlogPosts } from './seed-blog';
import { seedOnetCareerData } from './seed-onet-career';
import { seedOrganizationProgramCatalog } from '../lib/platform/seedProgramCatalog';
import { DEFAULT_BRAND_ACCENT } from '../lib/platform/brandColors';
import {
  CHS_PARTNER_NAME,
  CHS_PARTNER_REFERRAL_CODE,
  CHS_PARTNER_SLUG,
  CHS_PROGRAM_SLUGS,
  CHS_SPONSORSHIP_ENDS_AT,
  CHS_SPONSORSHIP_STARTS_AT,
  CHS_SPONSORSHIP_TERM_LABEL,
} from '../lib/partners/chsPartner';

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

/**
 * Launch partner for `/enroll/concordia`. Idempotent create — never clobbers
 * an existing row. The ops script `scripts/create-chs-partner.ts` still owns
 * repair of missing sponsorship fields; seed only guarantees the row exists
 * so a fresh environment does not 404 the student link.
 */
async function ensureConcordiaPartner(organizationId: string): Promise<void> {
  const existing = await prisma.partner.findUnique({
    where: { slug: CHS_PARTNER_SLUG },
    select: { id: true, name: true },
  });
  if (existing) {
    console.log(`Concordia partner already present (${existing.id})`);
    return;
  }

  const created = await prisma.partner.create({
    data: {
      organizationId,
      name: CHS_PARTNER_NAME,
      slug: CHS_PARTNER_SLUG,
      referralCode: CHS_PARTNER_REFERRAL_CODE,
      partnerType: 'high_school',
      status: 'active',
      active: true,
      contactName: 'Dr. Marianne Rader',
      contactEmail: 'marianne.rader@chsaustin.org',
      notes:
        '2026 CHS pilot — no cost to CHS students in 2026; funding: PARTNER_ORG; ' +
        'under-18 consent collected by school; see docs/runbooks/CONCORDIA-LAUNCH.md',
      sponsoredEnrollment: true,
      sponsorshipFundingSource: 'PARTNER_ORG',
      sponsorshipTermLabel: CHS_SPONSORSHIP_TERM_LABEL,
      sponsorshipStartsAt: CHS_SPONSORSHIP_STARTS_AT,
      sponsorshipEndsAt: CHS_SPONSORSHIP_ENDS_AT,
      sponsorshipNotes: 'Sponsored by Concordia High School (2026)',
      enrollmentPageEnabled: true,
      enrollmentHeadline: 'Start your career training with Concordia High School',
      enrollmentBlurb:
        'Career training and certifications offered at no cost to Concordia High School students for 2026 — sponsored through the WorkforceAP–Concordia partnership.',
      schoolDistrict: 'Concordia',
    },
  });

  for (const [index, programSlug] of CHS_PROGRAM_SLUGS.entries()) {
    await prisma.partnerProgramCatalog.upsert({
      where: { partnerId_programSlug: { partnerId: created.id, programSlug } },
      create: { partnerId: created.id, programSlug, displayOrder: index, featured: index === 0 },
      update: { displayOrder: index, featured: index === 0 },
    });
  }

  console.log(
    `CREATED partner "${created.name}" — id=${created.id}, slug=${created.slug}, referralCode=${created.referralCode}`,
  );
}

/** Dev/staging QA only — set SEED_TEST_ACCOUNTS=true. Supabase passwords (create users in Dashboard): TestWfAP2026! */

const PUBLIC_DEMO_JOB_EMAIL = 'public-job-demo@example.com';
const PUBLIC_DEMO_EMPLOYER_NAME = 'Capital Area Employer Network';
const PUBLIC_DEMO_JOB_TITLE_PREFIX = '[Demo] ';

// Always-seeded preview employer so super-admins can open /employer portal without SEED_TEST_ACCOUNTS.
// Uses reserved example.com domain — no real inbox, no Supabase auth needed (cookie impersonation).
const PREVIEW_EMPLOYER_EMAIL = 'employer-preview@example.com';
const PREVIEW_EMPLOYER_NAME = 'WorkforceAP Example Employer';
const PREVIEW_JOB_PREFIX = '[Preview] ';

const WAP_JOB_SEEDS = [
  {
    id: 'a1000001-0000-4000-8000-000000000001',
    title: 'Senior Counselor',
    location: 'Austin, TX (hybrid)',
    type: 'FT',
    descriptionMd:
      "Guide members through workforce training, WIOA eligibility, and job placement. Partner with employers and community organizations while using our AI-native platform to deliver high-touch coaching at scale.\n\n**What you'll do**\n- Coach members through training and job search\n- Review progress data and personalize support\n- Collaborate with ops and engineering on member outcomes",
    applyUrl: 'mailto:careers@workforceap.org?subject=Application%3A%20Senior%20Counselor',
  },
  {
    id: 'a1000001-0000-4000-8000-000000000002',
    title: 'Senior Engineer',
    location: 'Remote (US)',
    type: 'FT',
    descriptionMd:
      "Build the workforce engine that gets people to work. Ship product across our Next.js portal, Prisma data layer, and AI tooling that counselors and members rely on every day.\n\n**What you'll do**\n- Own features end-to-end across the stack\n- Improve reliability, performance, and accessibility\n- Partner with counselors and ops to ship member-facing impact",
    applyUrl: 'mailto:careers@workforceap.org?subject=Application%3A%20Senior%20Engineer',
  },
  {
    id: 'a1000001-0000-4000-8000-000000000003',
    title: 'Operations Lead',
    location: 'Austin, TX',
    type: 'FT',
    descriptionMd:
      "Run the operational backbone of a national workforce nonprofit — program logistics, partner coordination, and the systems that keep members moving from intake to placement.\n\n**What you'll do**\n- Own day-to-day program operations and partner workflows\n- Improve processes with clear metrics and feedback loops\n- Coordinate across counseling, engineering, and employer teams",
    applyUrl: 'mailto:careers@workforceap.org?subject=Application%3A%20Operations%20Lead',
  },
] as const;

async function seedWapJobs() {
  for (const job of WAP_JOB_SEEDS) {
    await prisma.wapJob.upsert({
      where: { id: job.id },
      create: { ...job, status: 'open' },
      update: {
        title: job.title,
        location: job.location,
        type: job.type,
        descriptionMd: job.descriptionMd,
        applyUrl: job.applyUrl,
        status: 'open',
      },
    });
  }
  console.log('Seeded WAP careers roles:', WAP_JOB_SEEDS.length);
}

/**
 * Ensures a few live jobs exist for the public /jobs board without SEED_TEST_ACCOUNTS.
 * Idempotent: skips if enough [Demo] live jobs already exist for the demo employer.
 */
async function seedPublicDemoJobs(organizationId: string) {
  const user = await prisma.user.upsert({
    where: { email: PUBLIC_DEMO_JOB_EMAIL },
    create: {
      id: randomUUID(),
      organizationId,
      email: PUBLIC_DEMO_JOB_EMAIL,
      fullName: 'Public job board seed',
    },
    update: {},
  });

  const employer = await prisma.employer.upsert({
    where: { userId: user.id },
    create: {
      organizationId,
      userId: user.id,
      companyName: PUBLIC_DEMO_EMPLOYER_NAME,
      contactName: 'WorkforceAP',
      contactEmail: PUBLIC_DEMO_JOB_EMAIL,
      tier: 'basic',
    },
    update: {
      companyName: PUBLIC_DEMO_EMPLOYER_NAME,
    },
  });

  const demoLiveCount = await prisma.job.count({
    where: {
      employerId: employer.id,
      status: 'live',
      title: { startsWith: PUBLIC_DEMO_JOB_TITLE_PREFIX },
    },
  });

  if (demoLiveCount >= 4) {
    console.log('Public demo jobs: already seeded (', demoLiveCount, 'live), skipping');
    return;
  }

  await prisma.job.deleteMany({
    where: {
      employerId: employer.id,
      title: { startsWith: PUBLIC_DEMO_JOB_TITLE_PREFIX },
    },
  });

  const specs: Array<{
    title: string;
    description: string;
    location: string;
    locationType: 'remote' | 'hybrid' | 'onsite';
    jobType: 'fulltime' | 'parttime' | 'contract';
    salaryMin?: number;
    salaryMax?: number;
    suggestedPrograms: string[];
    youthAppropriate: boolean;
    minimumAge: number | null;
  }> = [
    {
      title: `${PUBLIC_DEMO_JOB_TITLE_PREFIX}IT Support Specialist`,
      description:
        'Entry-level help desk role for a growing Austin team. You will troubleshoot hardware and software issues, document tickets, and support staff onboarding. Training provided; CompTIA pathway preferred.',
      location: 'Austin, TX',
      locationType: 'hybrid',
      jobType: 'fulltime',
      salaryMin: 42000,
      salaryMax: 52000,
      suggestedPrograms: ['it-support-professional-certificate-ibm'],
      youthAppropriate: false,
      minimumAge: 18,
    },
    {
      title: `${PUBLIC_DEMO_JOB_TITLE_PREFIX}Patient Services Representative`,
      description:
        'Front-desk and scheduling support at an outpatient clinic. Strong communication, basic computer skills, and a professional demeanor. HIPAA training provided.',
      location: 'Round Rock, TX',
      locationType: 'onsite',
      jobType: 'fulltime',
      salaryMin: 36000,
      salaryMax: 44000,
      suggestedPrograms: ['health-information-technology-mchit'],
      youthAppropriate: false,
      minimumAge: 18,
    },
    {
      title: `${PUBLIC_DEMO_JOB_TITLE_PREFIX}Remote Data Support Clerk`,
      description:
        'Part-time remote role updating records and light reporting in spreadsheets. Reliable internet and attention to detail required.',
      location: 'Texas (remote)',
      locationType: 'remote',
      jobType: 'parttime',
      salaryMin: 32000,
      salaryMax: 40000,
      suggestedPrograms: ['digital-literacy-empowerment-class', 'data-analytics-professional-certificate-google'],
      youthAppropriate: true,
      minimumAge: 16,
    },
    {
      title: `${PUBLIC_DEMO_JOB_TITLE_PREFIX}Cloud Operations Trainee`,
      description:
        'Rotational trainee supporting AWS-based workloads: monitoring, ticketing, and documentation. Ideal for certificate graduates seeking first cloud role.',
      location: 'San Antonio, TX',
      locationType: 'hybrid',
      jobType: 'fulltime',
      salaryMin: 48000,
      salaryMax: 62000,
      suggestedPrograms: ['aws-cloud-technology-amazon'],
      youthAppropriate: false,
      minimumAge: 18,
    },
  ];

  for (const s of specs) {
    await prisma.job.create({
      data: {
        organizationId,
        employerId: employer.id,
        title: s.title,
        description: s.description,
        location: s.location,
        locationType: s.locationType,
        jobType: s.jobType,
        salaryMin: s.salaryMin,
        salaryMax: s.salaryMax,
        suggestedPrograms: s.suggestedPrograms,
        youthAppropriate: s.youthAppropriate,
        minimumAge: s.minimumAge,
        status: 'live',
        requirements: ['Reliable attendance', 'Eligible to work in the U.S.'],
        preferredCertifications: [],
      },
    });
  }

  console.log('Seeded public demo jobs:', specs.length, 'for', PUBLIC_DEMO_EMPLOYER_NAME);
}

/**
 * Always-seeded preview employer for super-admin portal testing.
 * Active status guaranteed on every seed run — no SEED_TEST_ACCOUNTS flag required.
 * No Supabase auth account needed; super-admins preview via cookie impersonation.
 */
async function seedPreviewEmployer(organizationId: string) {
  const user = await prisma.user.upsert({
    where: { email: PREVIEW_EMPLOYER_EMAIL },
    create: {
      id: randomUUID(),
      organizationId,
      email: PREVIEW_EMPLOYER_EMAIL,
      fullName: 'Preview Employer Seed',
    },
    update: {},
  });

  const employer = await prisma.employer.upsert({
    where: { userId: user.id },
    create: {
      organizationId,
      userId: user.id,
      companyName: PREVIEW_EMPLOYER_NAME,
      contactName: 'WorkforceAP',
      contactEmail: PREVIEW_EMPLOYER_EMAIL,
      tier: 'basic',
      status: 'active',
    },
    update: {
      companyName: PREVIEW_EMPLOYER_NAME,
      status: 'active', // re-activate if ever deactivated
    },
  });

  const livePreviewCount = await prisma.job.count({
    where: {
      employerId: employer.id,
      status: 'live',
      title: { startsWith: PREVIEW_JOB_PREFIX },
    },
  });

  if (livePreviewCount >= 2) {
    console.log('Preview employer jobs: already seeded (', livePreviewCount, 'live), skipping');
    return;
  }

  await prisma.job.deleteMany({
    where: { employerId: employer.id, title: { startsWith: PREVIEW_JOB_PREFIX } },
  });

  const previewJobs: Array<{
    title: string;
    description: string;
    location: string;
    locationType: 'remote' | 'hybrid' | 'onsite';
    jobType: 'fulltime' | 'parttime' | 'contract';
  }> = [
    {
      title: `${PREVIEW_JOB_PREFIX}Administrative Coordinator`,
      description: 'Preview-only seed job for super-admin employer portal testing.',
      location: 'Austin, TX',
      locationType: 'onsite',
      jobType: 'fulltime',
    },
    {
      title: `${PREVIEW_JOB_PREFIX}Workforce Trainer`,
      description: 'Preview-only seed job for super-admin employer portal testing.',
      location: 'Remote',
      locationType: 'remote',
      jobType: 'parttime',
    },
  ];

  for (const j of previewJobs) {
    await prisma.job.create({
      data: {
        organizationId,
        employerId: employer.id,
        title: j.title,
        description: j.description,
        location: j.location,
        locationType: j.locationType,
        jobType: j.jobType,
        status: 'live',
        requirements: [],
        preferredCertifications: [],
      },
    });
  }

  console.log('Seeded preview employer:', PREVIEW_EMPLOYER_NAME, 'with', previewJobs.length, 'live jobs');
}

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

  await ensureConcordiaPartner(defaultOrgId);

  await seedOnetCareerData(prisma);

  // Seed admin users (Michael's personal + workforceap.org accounts are super_admin for real admin access)
  const superAdminEmails = ['mabrown040@gmail.com', 'michael.brown@workforceap.org'];
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
      update: { referralCode: p.slug, active: true }, // re-activate if deactivated in prod
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

  await seedPublicDemoJobs(defaultOrgId);
  await seedPreviewEmployer(defaultOrgId);
  await seedWapJobs();

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


