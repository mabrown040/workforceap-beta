/**
 * Employer job pipeline integrity checks.
 *
 * These are read-only assertions that surface orphaned or inconsistent
 * records without touching business logic. Called from the admin API and
 * can be wired to a nightly cron alert.
 */

import { prisma } from '@/lib/db/prisma';

export type PipelineIntegrityIssue = {
  type: 'orphan_job' | 'orphan_application' | 'orphan_match' | 'invalid_employer' | 'missing_student';
  id: string;
  message: string;
};

export type PipelineIntegrityResult = {
  ok: boolean;
  issues: PipelineIntegrityIssue[];
};

/**
 * Verify that every active job has a valid employer, every application
 * has a valid student + job, and no AI match record is orphaned.
 *
 * This is intentionally conservative: it checks the most common
 * referential-integrity gaps that manual admin actions or partial
 * deletions can leave behind.
 */
export async function verifyPipelineIntegrity(): Promise<PipelineIntegrityResult> {
  const issues: PipelineIntegrityIssue[] = [];

  // 1. Active jobs must have a valid employer
  const jobs = await prisma.job.findMany({
    where: { status: { in: ['draft', 'pending', 'approved', 'live'] } },
    select: { id: true, title: true, employerId: true },
  });

  const employerIds = new Set(
    (await prisma.employer.findMany({ select: { id: true } })).map((e) => e.id),
  );

  for (const job of jobs) {
    if (!employerIds.has(job.employerId)) {
      issues.push({
        type: 'invalid_employer',
        id: job.id,
        message: `Job "${job.title}" references missing employer ${job.employerId}`,
      });
    }
  }

  // 2. Applications must have valid student + job
  const applications = await prisma.jobPostingApplication.findMany({
    select: { id: true, jobId: true, studentId: true },
  });

  const userIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id),
  );
  const jobIds = new Set(jobs.map((j) => j.id));
  // Also include closed/filled jobs since applications can still reference them
  const allJobIds = new Set(
    (await prisma.job.findMany({ select: { id: true } })).map((j) => j.id),
  );

  for (const app of applications) {
    if (!allJobIds.has(app.jobId)) {
      issues.push({
        type: 'orphan_application',
        id: app.id,
        message: `Application references missing job ${app.jobId}`,
      });
    }
    if (!userIds.has(app.studentId)) {
      issues.push({
        type: 'missing_student',
        id: app.id,
        message: `Application references missing student ${app.studentId}`,
      });
    }
  }

  // 3. AI matches must have valid student + job
  const matches = await prisma.aIJobMatch.findMany({
    select: { id: true, jobId: true, studentId: true },
  });

  for (const match of matches) {
    if (!allJobIds.has(match.jobId)) {
      issues.push({
        type: 'orphan_match',
        id: match.id,
        message: `AI match references missing job ${match.jobId}`,
      });
    }
    if (!userIds.has(match.studentId)) {
      issues.push({
        type: 'missing_student',
        id: match.id,
        message: `AI match references missing student ${match.studentId}`,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}
