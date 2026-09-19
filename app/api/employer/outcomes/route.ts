import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isEmployer } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { logAuditEvent, auditRequestMeta } from '@/lib/audit/log';
import { auditLog } from '@/lib/audit';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/** Upper bound on posting rows returned to the dashboard table. */
const JOB_ROW_LIMIT = 200;

type ProgramRow = { program: string; applications: number; hired: number };

/**
 * GET /api/employer/outcomes
 * Employer outcomes dashboard — shows hiring pipeline effectiveness
 * for the employer's organization.
 */
async function _GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employer = await isEmployer(user.id);
    if (!employer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = await getActorOrganizationId(user.id);
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // Get employer profile
    const employerProfile = await prisma.employer.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        companyName: true,
        hiringPipelineActive: true,
      },
    });

    if (!employerProfile) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    // The dashboard lists postings by row, so that read stays bounded; every
    // other number on the page is an aggregate the database computes. Nothing
    // here materialises the application rows.
    const employerId = employerProfile.id;
    const [jobs, jobStatusCounts, applicationStatusCounts, programRows] = await Promise.all([
      prisma.job.findMany({
        where: { employerId },
        select: {
          id: true,
          title: true,
          status: true,
          applicationsCount: true,
        },
        orderBy: { createdAt: 'desc' },
        take: JOB_ROW_LIMIT,
      }),
      prisma.job.groupBy({
        by: ['status'],
        where: { employerId },
        _count: { _all: true },
      }),
      prisma.jobApplication.groupBy({
        by: ['status'],
        where: { curatedJob: { employerId } },
        _count: { _all: true },
      }),
      // Grouping by the applicant's program crosses a relation, which Prisma's
      // groupBy cannot express, so this one aggregate is plain SQL. An empty or
      // missing program is reported as 'unknown', matching the previous
      // row-by-row fold; rows come back alphabetical so the breakdown is stable.
      prisma.$queryRaw<ProgramRow[]>`
        SELECT COALESCE(NULLIF(u.enrolled_program, ''), 'unknown') AS program,
               COUNT(*)::int AS applications,
               COUNT(*) FILTER (WHERE ja.status = 'ACCEPTED')::int AS hired
        FROM job_applications ja
        INNER JOIN jobs j ON j.id = ja.curated_job_id
        INNER JOIN users u ON u.id = ja.user_id
        WHERE j.employer_id = ${employerId}
        GROUP BY 1
        ORDER BY 1
      `,
    ]);

    // Calculate metrics
    const jobCountByStatus = new Map(jobStatusCounts.map((row) => [row.status, row._count._all]));
    const applicationCountByStatus = new Map(applicationStatusCounts.map((row) => [row.status, row._count._all]));
    const sumCounts = (counts: Map<string, number>, statuses?: readonly string[]) => {
      let total = 0;
      for (const [status, count] of counts) {
        if (!statuses || statuses.includes(status)) total += count;
      }
      return total;
    };

    const totalJobs = sumCounts(jobCountByStatus);
    const activeJobs = jobCountByStatus.get('live') ?? 0;
    const totalApplications = sumCounts(applicationCountByStatus);
    const newApplications = applicationCountByStatus.get('SAVED') ?? 0;
    const reviewedApplications = sumCounts(applicationCountByStatus, ['APPLIED', 'PHONE_SCREEN']);
    const hiredApplications = applicationCountByStatus.get('ACCEPTED') ?? 0;
    const rejectedApplications = applicationCountByStatus.get('REJECTED') ?? 0;

    const conversionRate = totalApplications > 0
      ? Math.round((hiredApplications / totalApplications) * 100)
      : 0;

    // Program breakdown
    const programStats = programRows.map((row) => ({
      name: row.program,
      applications: Number(row.applications),
      hired: Number(row.hired),
    }));

    // Audit log
    await logAuditEvent({
      user: { id: user.id },
      verb: 'viewed',
      object: { type: 'EmployerOutcomes', id: employerProfile.id },
      request: auditRequestMeta(request),
    });
    auditLog({ actorUserId: user.id, action: 'employer_outcomes_viewed', targetType: 'Employer', targetId: employerProfile.id, metadata: {} }).catch(() => {});

    return NextResponse.json({
      employer: {
        companyName: employerProfile.companyName,
        hiringPipelineActive: employerProfile.hiringPipelineActive,
      },
      metrics: {
        totalJobs,
        activeJobs,
        totalApplications,
        newApplications,
        reviewedApplications,
        hiredApplications,
        rejectedApplications,
        conversionRate,
      },
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        applications: j.applicationsCount,
      })),
      programStats: programStats.map((p) => ({
        ...p,
        conversionRate: p.applications > 0 ? Math.round((p.hired / p.applications) * 100) : 0,
      })),
    });
  } catch (error) {
    console.error('GET /api/employer/outcomes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
