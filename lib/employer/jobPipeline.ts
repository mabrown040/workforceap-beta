import prisma from "@/lib/db/prisma";

/**
 * Verifies structural integrity of the employer job pipeline.
 * Checks for orphaned jobs, applications, and job matches.
 */
export async function verifyPipelineIntegrity(): Promise<{
  ok: boolean;
  issues: Array<{ type: string; id: string; message: string }>;
}> {
  const issues: Array<{ type: string; id: string; message: string }> = [];

  // 1. Orphan jobs: jobs with no associated employer
  const orphanJobs = await prisma.job.findMany({
    where: { employerId: null },
    select: { id: true },
  });
  for (const job of orphanJobs) {
    issues.push({
      type: "orphan_job",
      id: job.id,
      message: `Job ${job.id} has no employerId.`,
    });
  }

  // 2. Orphan applications: applications with no member
  const orphanApplications = await prisma.application.findMany({
    where: { memberId: null },
    select: { id: true },
  });
  for (const app of orphanApplications) {
    issues.push({
      type: "orphan_application",
      id: app.id,
      message: `Application ${app.id} has no memberId.`,
    });
  }

  // 3. Orphan matches: job matches with no job
  const orphanMatches = await prisma.jobMatch.findMany({
    where: { jobId: null },
    select: { id: true },
  });
  for (const match of orphanMatches) {
    issues.push({
      type: "orphan_match",
      id: match.id,
      message: `JobMatch ${match.id} has no jobId.`,
    });
  }

  return { ok: issues.length === 0, issues };
}
