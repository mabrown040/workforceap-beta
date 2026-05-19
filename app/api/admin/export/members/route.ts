import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { getProgramBySlug } from '@/lib/content/programs';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStage } from '@/lib/pipeline/stage';
import { buildCsv, csvDate } from '@/lib/csv';
import { MEMBER_ONLY_WHERE } from '@/lib/admin/memberOnlyWhere';

import { withRouteObservability } from '@/lib/api/routeObservability';export const GET = withRouteObservability(async (req: NextRequest) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const params = req.nextUrl.searchParams;
  const filterState = params.get('state') || undefined;
  const filterStage = params.get('stage') || undefined;
  const filterProgram = params.get('program') || undefined;
  const filterWioa = params.get('wioaStatus') || undefined;
  const filterDateFrom = params.get('dateFrom') || undefined;
  const filterDateTo = params.get('dateTo') || undefined;
  const filterCoursera = params.get('courseraStatus') || undefined;

  // Build Prisma where clause — scoped to actual members only
  const where: Record<string, unknown> = { deletedAt: null, ...MEMBER_ONLY_WHERE };

  if (filterProgram) where.enrolledProgram = filterProgram;
  if (filterWioa) where.wioaReviewStatus = filterWioa;
  if (filterDateFrom || filterDateTo) {
    const createdAt: Record<string, Date> = {};
    if (filterDateFrom) createdAt.gte = new Date(filterDateFrom);
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      createdAt.lte = to;
    }
    where.createdAt = createdAt;
  }

  const orgId = await getActorOrganizationId(user.id);

  const EXPORT_LIMIT = 10_000;
  const users = await withTenantScope(orgId, (db) =>
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: EXPORT_LIMIT,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        enrolledProgram: true,
        enrolledAt: true,
        assessmentCompleted: true,
        memberProgramProgress: {
          select: { programSlug: true, averagePercent: true, coursesCompleted: true },
        },
        courseProgress: {
          where: { status: 'COMPLETED' },
          select: { programSlug: true, courseSlug: true },
        },
        assessmentScorePct: true,
        pipelineBoardStage: true,
        wioaQualificationJson: true,
        wioaReviewStatus: true,
        deletedAt: true,
        createdAt: true,
        profile: {
          select: {
            state: true,
            city: true,
            zip: true,
            educationLevel: true,
            employmentStatus: true,
            veteranStatus: true,
            householdIncome: true,
            dob: true,
            ethnicity: true,
          },
        },
        placementRecord: {
          select: {
            employerName: true,
            jobTitle: true,
            salaryOffered: true,
            placedAt: true,
          },
        },
        userCertifications: {
          select: { certName: true, earnedAt: true },
        },
        applications: {
          select: { status: true, submittedAt: true },
        },
        // Multi-program: export uses the primary enrollment for the funding
        // / programSlug column. Secondary enrollments are intentionally not
        // exported here (a separate report would list all enrollments).
        courseEnrollments: {
          where: { isPrimary: true },
          select: {
            programSlug: true,
            fundingSource: true,
            fundingNotes: true,
            enrolledAt: true,
          },
          take: 1,
        },
        trainingAccessRequests: {
          select: { providerKey: true, status: true, activatedAt: true },
        },
      },
    }),
  );

  // Apply post-query filters that need computed fields
  const rows: typeof users = [];
  for (const u of users) {
    // State filter (profile.state)
    if (filterState && u.profile?.state !== filterState) continue;

    // Pipeline stage filter
    const stage = getPipelineStage(u as Parameters<typeof getPipelineStage>[0]);
    if (filterStage && stage !== filterStage) continue;

    // Coursera access status filter
    if (filterCoursera) {
      const courseraReq = u.trainingAccessRequests.find(
        (r) => r.providerKey === 'coursera',
      );
      const courseraStatus = courseraReq?.status ?? 'NONE';
      if (filterCoursera !== courseraStatus) continue;
    }

    rows.push(u);
  }

  // Build CSV
  const csvColumns = [
    'Full Name',
    'Email',
    'Phone',
    'State',
    'City',
    'Zip',
    'Date of Birth',
    'Education Level',
    'Employment Status',
    'Veteran Status',
    'Household Income',
    'Ethnicity',
    'Signup Date',
    'Pipeline Stage',
    'Program',
    'Enrollment Date',
    'Funding Source',
    'Courses Completed',
    'Total Courses',
    'Completion %',
    'Completed Course Names',
    'Coursera Access',
    'Coursera Activated',
    'Assessment Done',
    'Assessment Score',
    'WIOA Signal',
    'WIOA Review Status',
    'Certifications',
    'Placed Employer',
    'Placed Job Title',
    'Placed Salary',
    'Placed Date',
  ];

  const csvRows = rows.map((u) => {
    const stage = getPipelineStage(u as Parameters<typeof getPipelineStage>[0]);
    const stageLabel = PIPELINE_STAGE_LABELS[stage as PipelineStage] ?? stage;

    const program = u.enrolledProgram ? getProgramBySlug(u.enrolledProgram) : null;
    const programTitle = program?.title ?? u.enrolledProgram ?? '';
    const totalCourses = program?.courses.length ?? 0;
    const completed = u.enrolledProgram
      ? u.courseProgress
          .filter((row) => row.programSlug === u.enrolledProgram)
          .map((row) => row.courseSlug)
      : [];
    const rollup = u.enrolledProgram
      ? u.memberProgramProgress.find((row) => row.programSlug === u.enrolledProgram) ?? null
      : null;
    const completionPct = totalCourses > 0
      ? Math.max(0, Math.min(100, rollup?.averagePercent ?? Math.round((completed.length / totalCourses) * 100)))
      : 0;

    // Map completed slugs to course names from canonical CourseProgress rows.
    const completedNames = program
      ? completed
          .map((slug) => program.courses.find((c) => c.slug === slug)?.name ?? slug)
          .join('; ')
      : completed.join('; ');

    const courseraReq = u.trainingAccessRequests.find((r) => r.providerKey === 'coursera');
    const courseraStatus = courseraReq?.status ?? 'None';

    const wioa = u.wioaQualificationJson as { signal?: string } | null;
    const wioaSignal = wioa?.signal ?? '';

    const enrollment = u.courseEnrollments[0] ?? null;
    const fundingSource = enrollment?.fundingSource ?? '';

    const certs = u.userCertifications.map((c) => c.certName).join('; ');

    const p = u.placementRecord;

    return [
      u.fullName,
      u.email,
      u.phone,
      u.profile?.state,
      u.profile?.city,
      u.profile?.zip,
      csvDate(u.profile?.dob),
      u.profile?.educationLevel,
      u.profile?.employmentStatus,
      u.profile?.veteranStatus,
      u.profile?.householdIncome,
      u.profile?.ethnicity,
      csvDate(u.createdAt),
      stageLabel,
      programTitle,
      csvDate(u.enrolledAt),
      fundingSource,
      completed.length,
      totalCourses,
      totalCourses > 0 ? `${completionPct}%` : '',
      completedNames,
      courseraStatus,
      csvDate(courseraReq?.activatedAt),
      u.assessmentCompleted ? 'Yes' : 'No',
      u.assessmentScorePct != null ? `${u.assessmentScorePct}%` : '',
      wioaSignal,
      u.wioaReviewStatus,
      certs,
      p?.employerName,
      p?.jobTitle,
      p?.salaryOffered != null ? `$${p.salaryOffered.toLocaleString()}` : '',
      csvDate(p?.placedAt),
    ];
  });

  const csv = buildCsv(csvColumns, csvRows, { reportTitle: 'Member Training Export', notes: 'Workforce training qualification reporting — Workforce Advancement Project' });
  const filename = `workforceap-members-export-${new Date().toISOString().slice(0, 10)}.csv`;

  const headers: Record<string, string> = {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  };
  if (users.length >= EXPORT_LIMIT) {
    headers['X-Export-Truncated'] = `true`;
    headers['X-Export-Limit'] = `${EXPORT_LIMIT}`;
  }

  return new NextResponse(csv, { status: 200, headers });

  } catch (error) {
    console.error('/admin/export/members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

