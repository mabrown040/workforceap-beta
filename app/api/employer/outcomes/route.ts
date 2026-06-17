import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isEmployer } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { logAuditEvent, auditRequestMeta } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

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

    // Get job postings
    const jobs = await prisma.job.findMany({
      where: {
        employerId: employerProfile.id,
      },
      select: {
        id: true,
        title: true,
        status: true,
        applicationsCount: true,
      },
    });

    // Get applications via curated jobs
    const jobIds = jobs.map((j) => j.id);
    const applications = await prisma.jobApplication.findMany({
      where: {
        curatedJobId: { in: jobIds },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            enrolledProgram: true,
          },
        },
      },
    });

    // Calculate metrics
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((j) => j.status === 'live').length;
    const totalApplications = applications.length;
    const newApplications = applications.filter((a) => a.status === 'SAVED').length;
    const reviewedApplications = applications.filter((a) => a.status === 'APPLIED' || a.status === 'PHONE_SCREEN').length;
    const hiredApplications = applications.filter((a) => a.status === 'ACCEPTED').length;
    const rejectedApplications = applications.filter((a) => a.status === 'REJECTED').length;

    const conversionRate = totalApplications > 0
      ? Math.round((hiredApplications / totalApplications) * 100)
      : 0;

    // Program breakdown
    const programStats: Record<string, { name: string; applications: number; hired: number }> = {};
    for (const app of applications) {
      const program = app.user.enrolledProgram || 'unknown';
      if (!programStats[program]) {
        programStats[program] = { name: program, applications: 0, hired: 0 };
      }
      programStats[program].applications++;
      if (app.status === 'ACCEPTED') {
        programStats[program].hired++;
      }
    }

    // Audit log
    await logAuditEvent({
      user: { id: user.id },
      verb: 'viewed',
      object: { type: 'EmployerOutcomes', id: employerProfile.id },
      request: auditRequestMeta(request),
    });

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
      programStats: Object.values(programStats).map((p) => ({
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
