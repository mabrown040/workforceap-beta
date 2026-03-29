/**
 * seed-demo.ts — Full demo environment seed for WorkforceAP
 *
 * Creates a realistic demo dataset for investor/partner demos and testing.
 * Safe to run multiple times (idempotent via upsert).
 *
 * Run with: npm run db:seed:demo
 * Requires: SEED_DEMO=true in environment
 */

import { randomUUID } from 'crypto';
import { PrismaClient, ApplicationStatus, JobLocationType, JobTypeEnum, JobStatusEnum, AIJobMatchStatus } from '@prisma/client';
import { seedOrganizationProgramCatalog } from '../lib/platform/seedProgramCatalog';
import { DEMO_JOBS, DEMO_AI_MATCHES } from './fixtures/demo-employer-data';
import { DEFAULT_BRAND_ACCENT } from '../lib/platform/brandColors';

const prisma = new PrismaClient();

// ─── Demo account credentials (create in Supabase Auth manually) ────────────
// Email                          Password         Portal
// demo-member@workforceap.org    Demo2026!        /dashboard
// demo-employer@workforceap.org  Demo2026!        /employer
// demo-partner@workforceap.org   Demo2026!        /partner
// demo-admin@workforceap.org     Demo2026!        /admin

const DEMO_ORG_SLUG = 'workforceap';

async function getOrgId(): Promise<string> {
  await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    create: {
      name: 'WorkforceAP',
      slug: DEMO_ORG_SLUG,
      billingType: 'flat',
      plan: 'nonprofit',
      active: true,
      primaryColor: DEFAULT_BRAND_ACCENT,
    },
    update: {},
  });
  const org = await prisma.organization.findUniqueOrThrow({
    where: { slug: DEMO_ORG_SLUG },
    select: { id: true },
  });
  return org.id;
}

async function seedRoles() {
  const roles = ['member', 'admin', 'case_manager', 'counselor', 'partner', 'employer'];
  for (const name of roles) {
    await prisma.role.upsert({ where: { name }, create: { name }, update: {} });
  }
}

async function seedDemoPartners(orgId: string) {
  const partners = [
    {
      name: 'Workforce Solutions Capital Area',
      slug: 'workforce-solutions-austin',
      referralCode: 'workforce-solutions-austin',
      orgType: 'Workforce Center',
    },
    {
      name: 'Austin Area Urban League',
      slug: 'austin-urban-league',
      referralCode: 'austin-urban-league',
      orgType: 'Nonprofit',
    },
    {
      name: 'St. John Regular Baptist Church',
      slug: 'st-john-baptist',
      referralCode: 'st-john-baptist',
      orgType: 'Faith Organization',
    },
    {
      name: 'Capital IDEA',
      slug: 'capital-idea',
      referralCode: 'capital-idea',
      orgType: 'Workforce Center',
    },
    {
      name: 'Texas Workforce Commission',
      slug: 'twc',
      referralCode: 'twc',
      orgType: 'Government Agency',
    },
  ];

  const partnerIds: Record<string, string> = {};
  for (const p of partners) {
    const row = await prisma.partner.upsert({
      where: { slug: p.slug },
      create: { ...p, organizationId: orgId },
      update: { referralCode: p.referralCode },
      select: { id: true, slug: true },
    });
    partnerIds[p.slug] = row.id;
  }
  console.log('Seeded partners:', partners.length);
  return partnerIds;
}

async function seedDemoMembers(orgId: string, partnerIds: Record<string, string>) {
  const memberRole = await prisma.role.findUniqueOrThrow({ where: { name: 'member' } });

  const members = [
    {
      email: 'demo-member@workforceap.org',
      fullName: 'Jordan Williams',
      phone: '5124445001',
      program: 'ai-professional-developer-certificate-ibm',
      coursesCompleted: ['Module 1: Python Basics', 'Module 2: Data Structures', 'Module 3: ML Fundamentals'],
      assessmentScore: 84,
      status: 'enrolled',
      partnerSlug: 'workforce-solutions-austin',
      applicationStatus: ApplicationStatus.APPROVED,
      interviewEligible: true,
      notes: 'Strong candidate — excelling in ML modules. Employer match pending.',
    },
    {
      email: 'maria.santos@demo.workforceap.org',
      fullName: 'Maria Santos',
      phone: '5124445002',
      program: 'google-it-support-certificate',
      coursesCompleted: ['Module 1: Technical Support Fundamentals', 'Module 2: The Bits and Bytes of Computer Networking'],
      assessmentScore: 79,
      status: 'enrolled',
      partnerSlug: 'austin-urban-league',
      applicationStatus: ApplicationStatus.APPROVED,
      interviewEligible: false,
    },
    {
      email: 'darnell.hayes@demo.workforceap.org',
      fullName: 'Darnell Hayes',
      phone: '5124445003',
      program: 'aws-cloud-technology-amazon',
      coursesCompleted: [
        'Module 1: Cloud Practitioner Essentials',
        'Module 2: AWS Core Services',
        'Module 3: Security on AWS',
        'Module 4: Architecting on AWS',
        'Module 5: AWS Solutions Architect Associate',
      ],
      assessmentScore: 91,
      status: 'placed',
      partnerSlug: 'capital-idea',
      applicationStatus: ApplicationStatus.APPROVED,
      interviewEligible: true,
      placedAt: new Date('2026-02-14'),
      placedJobTitle: 'Cloud Infrastructure Specialist',
      placedEmployer: 'Accenture Federal Services',
      placedSalary: 72000,
      notes: 'Placed at Accenture. Highest assessment score in cohort.',
    },
    {
      email: 'priya.kumar@demo.workforceap.org',
      fullName: 'Priya Kumar',
      phone: '5124445004',
      program: 'data-analytics-google',
      coursesCompleted: ['Module 1: Foundations', 'Module 2: Ask Questions to Make Data-Driven Decisions'],
      assessmentScore: 76,
      status: 'enrolled',
      partnerSlug: 'st-john-baptist',
      applicationStatus: ApplicationStatus.APPROVED,
      interviewEligible: false,
    },
    {
      email: 'marcus.bell@demo.workforceap.org',
      fullName: 'Marcus Bell',
      phone: '5124445005',
      program: 'cybersecurity-google',
      coursesCompleted: [
        'Module 1: Foundations of Cybersecurity',
        'Module 2: Play It Safe: Manage Security Risks',
        'Module 3: Connect and Protect',
        'Module 4: Tools of the Trade: Linux and SQL',
        'Module 5: Assets, Threats, and Vulnerabilities',
        'Module 6: Sound the Alarm: Detection and Response',
        'Module 7: Automate Cybersecurity Tasks with Python',
        'Module 8: Put It to Work: Prepare for Cybersecurity Jobs',
      ],
      assessmentScore: 88,
      status: 'certified',
      partnerSlug: 'twc',
      applicationStatus: ApplicationStatus.APPROVED,
      interviewEligible: true,
      notes: 'Google Cybersecurity cert earned. Actively interviewing with 3 Austin employers.',
    },
    {
      email: 'alicia.torres@demo.workforceap.org',
      fullName: 'Alicia Torres',
      phone: '5124445006',
      program: 'digital-literacy-empowerment-class',
      coursesCompleted: ['Module 1: Device Distribution & Setup', 'Module 2: Introduction to Emails'],
      assessmentScore: 68,
      status: 'enrolled',
      partnerSlug: 'austin-urban-league',
      applicationStatus: ApplicationStatus.APPROVED,
      interviewEligible: false,
    },
    {
      email: 'james.oconnor@demo.workforceap.org',
      fullName: 'James O\'Connor',
      phone: '5124445007',
      program: 'comptia-a-plus',
      coursesCompleted: [],
      assessmentScore: null,
      status: 'applied',
      partnerSlug: null,
      applicationStatus: ApplicationStatus.PENDING,
      interviewEligible: false,
    },
    {
      email: 'keisha.washington@demo.workforceap.org',
      fullName: 'Keisha Washington',
      phone: '5124445008',
      program: 'aws-cloud-technology-amazon',
      coursesCompleted: [
        'Module 1: Cloud Practitioner Essentials',
        'Module 2: AWS Core Services',
        'Module 3: Security on AWS',
      ],
      assessmentScore: 82,
      status: 'placed',
      partnerSlug: 'workforce-solutions-austin',
      applicationStatus: ApplicationStatus.APPROVED,
      interviewEligible: true,
      placedAt: new Date('2026-03-01'),
      placedJobTitle: 'Junior Cloud Engineer',
      placedEmployer: 'Dell Technologies',
      placedSalary: 65000,
      notes: 'Placed at Dell. First placement from Capital Area Workforce cohort.',
    },
  ];

  const memberIds: Record<string, string> = {};

  for (const m of members) {
    const id = randomUUID();
    const user = await prisma.user.upsert({
      where: { email: m.email },
      create: {
        id,
        organizationId: orgId,
        email: m.email,
        fullName: m.fullName,
        phone: m.phone,
        enrolledProgram: m.program,
        coursesCompleted: m.coursesCompleted,
        assessmentCompleted: m.assessmentScore !== null,
        assessmentCompletedAt: m.assessmentScore !== null ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : null,
        assessmentScorePct: m.assessmentScore,
        interviewEligible: m.interviewEligible,
      },
      update: {
        enrolledProgram: m.program,
        coursesCompleted: m.coursesCompleted,
        assessmentCompleted: m.assessmentScore !== null,
        assessmentScorePct: m.assessmentScore,
        interviewEligible: m.interviewEligible,
      },
      select: { id: true },
    });
    memberIds[m.email] = user.id;

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: memberRole.id } },
      create: { userId: user.id, roleId: memberRole.id },
      update: {},
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        zip: '78701',
        city: 'Austin',
        state: 'TX',
        consentTerms: true,
        role: 'member',
      },
      update: {},
    });

    // Application
    const existingApp = await prisma.application.findFirst({ where: { userId: user.id } });
    if (!existingApp) {
      await prisma.application.create({
        data: {
          userId: user.id,
          status: m.applicationStatus,
          programInterest: m.program,
          submittedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Partner referral
    if (m.partnerSlug && partnerIds[m.partnerSlug]) {
      await prisma.partnerReferral.upsert({
        where: { partnerId_memberId: { partnerId: partnerIds[m.partnerSlug], memberId: user.id } },
        create: { partnerId: partnerIds[m.partnerSlug], memberId: user.id },
        update: {},
      });
    }

    // Placement record
    if (m.placedAt && m.placedJobTitle && m.placedEmployer) {
      const existingEvent = await prisma.memberEvent.findFirst({
        where: { userId: user.id, eventName: 'placed' },
      });
      if (!existingEvent) {
        await prisma.memberEvent.create({
          data: {
            userId: user.id,
            eventName: 'placed',
            metadata: {
              jobTitle: m.placedJobTitle,
              employer: m.placedEmployer,
              salary: m.placedSalary,
              placedAt: m.placedAt.toISOString(),
            },
          },
        });
      }
    }

    // Counselor notes (CounselorNote model uses memberId + authorId + content)
    if (m.notes) {
      const existing = await prisma.counselorNote.findFirst({ where: { memberId: user.id } });
      if (!existing) {
        await prisma.counselorNote.create({
          data: { memberId: user.id, content: m.notes, authorId: user.id },
        });
      }
    }
  }

  console.log('Seeded demo members:', members.length);
  return memberIds;
}

async function seedDemoEmployerPortal(orgId: string, memberIds: Record<string, string>) {
  const employerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'employer' } });

  // Demo employer user (portal login)
  const empUserId = randomUUID();
  const empUser = await prisma.user.upsert({
    where: { email: 'demo-employer@workforceap.org' },
    create: {
      id: empUserId,
      organizationId: orgId,
      email: 'demo-employer@workforceap.org',
      fullName: 'Sarah Chen',
      phone: '5124446001',
    },
    update: { fullName: 'Sarah Chen' },
    select: { id: true },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: empUser.id, roleId: employerRole.id } },
    create: { userId: empUser.id, roleId: employerRole.id },
    update: {},
  });

  const employer = await prisma.employer.upsert({
    where: { userId: empUser.id },
    create: {
      organizationId: orgId,
      userId: empUser.id,
      companyName: 'Contango IT',
      contactName: 'Sarah Chen',
      contactEmail: 'demo-employer@workforceap.org',
      tier: 'partner',
      industry: 'Technology',
      companySize: '51-200',
      companyWebsite: 'https://contangoit.com',
      logoUrl: null,
    },
    update: { companyName: 'Contango IT', tier: 'partner' },
    select: { id: true },
  });

  // Realistic job postings


  const jobIds: string[] = [];
  for (const j of DEMO_JOBS) {
    // Check if job exists to avoid duplicates
    const existing = await prisma.job.findFirst({
      where: { employerId: employer.id, title: j.title },
    });
    const job = existing ?? await prisma.job.create({
      data: {
        organizationId: orgId,
        employerId: employer.id,
        title: j.title,
        description: j.description,
        location: j.location,
        locationType: j.locationType,
        jobType: j.jobType,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        requirements: j.requirements,
        status: j.status,
      },
    });
    jobIds.push(job.id);
  }

  // AI match records — link members to relevant jobs


  for (const mp of DEMO_AI_MATCHES) {
    const memberId = memberIds[mp.memberEmail];
    const jobId = jobIds[mp.jobIdx];
    if (!memberId || !jobId) continue;

    const existing = await prisma.aIJobMatch.findFirst({ where: { jobId, studentId: memberId } });
    if (!existing) {
      await prisma.aIJobMatch.create({
        data: {
          jobId,
          studentId: memberId,
          matchScore: mp.score,
          matchReasons: mp.reasons,
          status: mp.status,
          statusUpdatedAt: mp.status !== 'suggested' ? new Date() : null,
        },
      });
    }
  }

  console.log('Seeded demo employer (Contango IT) with', DEMO_JOBS.length, 'jobs and', DEMO_AI_MATCHES.length, 'AI matches');
  return empUser.id;
}

async function seedDemoPartnerUser(orgId: string, partnerIds: Record<string, string>) {
  const partnerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'partner' } });

  const ptUserId = randomUUID();
  const ptUser = await prisma.user.upsert({
    where: { email: 'demo-partner@workforceap.org' },
    create: {
      id: ptUserId,
      organizationId: orgId,
      email: 'demo-partner@workforceap.org',
      fullName: 'Angela Davis',
      phone: '5124447001',
    },
    update: { fullName: 'Angela Davis' },
    select: { id: true },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: ptUser.id, roleId: partnerRole.id } },
    create: { userId: ptUser.id, roleId: partnerRole.id },
    update: {},
  });

  const wsPartnerId = partnerIds['workforce-solutions-austin'];
  if (wsPartnerId) {
    await prisma.partnerUser.upsert({
      where: { userId: ptUser.id },
      create: { partnerId: wsPartnerId, userId: ptUser.id },
      update: { partnerId: wsPartnerId },
    });
  }

  console.log('Seeded demo partner user (Angela Davis — Workforce Solutions Capital Area)');
}

async function seedDemoAdminUser(orgId: string) {
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });

  const adminId = randomUUID();
  const adminUser = await prisma.user.upsert({
    where: { email: 'demo-admin@workforceap.org' },
    create: {
      id: adminId,
      organizationId: orgId,
      email: 'demo-admin@workforceap.org',
      fullName: 'Michael Brown',
      phone: '5124448001',
    },
    update: { fullName: 'Michael Brown' },
    select: { id: true },
  });

  await prisma.profile.upsert({
    where: { userId: adminUser.id },
    create: { userId: adminUser.id, zip: '78701', consentTerms: true, role: 'super_admin' },
    update: { role: 'super_admin' },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    create: { userId: adminUser.id, roleId: adminRole.id },
    update: {},
  });

  console.log('Seeded demo admin user');
}

async function main() {
  if (process.env.SEED_DEMO !== 'true') {
    console.error('Set SEED_DEMO=true to run the demo seed. Exiting.');
    process.exit(1);
  }

  console.log('🌱 Starting WorkforceAP demo seed...');

  const orgId = await getOrgId();
  await seedRoles();
  await seedOrganizationProgramCatalog(orgId);
  const partnerIds = await seedDemoPartners(orgId);
  const memberIds = await seedDemoMembers(orgId, partnerIds);
  await seedDemoEmployerPortal(orgId, memberIds);
  await seedDemoPartnerUser(orgId, partnerIds);
  await seedDemoAdminUser(orgId);

  console.log(`
✅ Demo seed complete!

Portal logins (create these in Supabase Auth → Users → Invite):
  Member:   demo-member@workforceap.org   / Demo2026!  → /dashboard
  Employer: demo-employer@workforceap.org / Demo2026!  → /employer
  Partner:  demo-partner@workforceap.org  / Demo2026!  → /partner
  Admin:    demo-admin@workforceap.org    / Demo2026!  → /admin

What was seeded:
  - 8 demo members (various pipeline stages: applied → enrolled → certified → placed)
  - 5 partner organizations with referral history
  - 1 employer (Contango IT) with 5 realistic job postings
  - 6 AI job match records showing the matching pipeline
  - Program catalog populated from 19 static programs
  `);
}

main()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
