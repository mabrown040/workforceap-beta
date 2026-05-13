import { prisma } from '@/lib/db/prisma';
import {
  getOrComputeAiJobMatches,
  markAiJobMatchEmptyCooldown,
  clearAiJobMatchEmptyCooldown,
} from '@/lib/admin/aiJobMatchCompute';
import { createNotification } from '@/lib/notifications/create';
import type { RunAdminJobMatchesDeps } from '@/lib/admin/runAdminJobMatchesGet';

const jobSelectForMatch = {
  id: true,
  title: true,
  requirements: true,
  suggestedPrograms: true,
  preferredCertifications: true,
};

const aiJobMatchStudentInclude = {
  student: {
    select: {
      id: true,
      fullName: true,
      email: true,
      enrolledProgram: true,
      assessmentScorePct: true,
      profile: { select: { city: true, state: true } },
      userCertifications: { select: { certName: true } },
    },
  },
};

function findAiJobMatchRowsForAdmin(jobId: string) {
  return prisma.aIJobMatch.findMany({
    where: { jobId },
    include: aiJobMatchStudentInclude,
    orderBy: { matchScore: 'desc' },
    take: 10,
  });
}

/**
 * Shared Prisma-backed callbacks for {@link runAdminJobMatchesGet}.
 * Supply {@link RunAdminJobMatchesDeps.logDiagnostic} per call site (admin UI vs employer auto-match).
 */
export function createAdminJobMatchesPrismaDeps(
  logDiagnostic: RunAdminJobMatchesDeps['logDiagnostic']
): RunAdminJobMatchesDeps {
  return {
    findJobForMatch: (jid) =>
      prisma.job.findUnique({
        where: { id: jid },
        select: jobSelectForMatch,
      }),
    findCachedRows: findAiJobMatchRowsForAdmin,
    computeMatches: (jid, job) => getOrComputeAiJobMatches(jid, job),
    persistMatches: async (jid, matches) => {
      if (matches.length === 0) return;
      const existing = await prisma.aIJobMatch.findMany({
        where: { jobId: jid },
        select: { studentId: true },
      });
      const existingIds = new Set(existing.map((e) => e.studentId));
      const newMatches = matches.filter((m) => !existingIds.has(m.studentId));

      if (newMatches.length > 0) {
        await prisma.aIJobMatch.createMany({
          data: newMatches.map((m) => ({
            jobId: jid,
            studentId: m.studentId,
            matchScore: m.matchScore,
            matchReasons: m.matchReasons,
          })),
        });

        const job = await prisma.job.findUnique({
          where: { id: jid },
          select: { title: true },
        });

        for (const m of newMatches) {
          void createNotification({
            userId: m.studentId,
            type: 'job_match',
            title: 'New job match',
            body: `We found a match: ${job?.title ?? 'a new position'}`,
            data: { jobId: jid, matchScore: m.matchScore },
          });
        }
      }
    },
    markMatchesComputedAt: (jid) =>
      prisma.job.update({
        where: { id: jid },
        data: { aiMatchesComputedAt: new Date() },
      }),
    reloadRows: findAiJobMatchRowsForAdmin,
    markEmptyCooldown: markAiJobMatchEmptyCooldown,
    clearEmptyCooldown: clearAiJobMatchEmptyCooldown,
    logDiagnostic,
  };
}
