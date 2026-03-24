import { prisma } from '@/lib/db/prisma';
import {
  getOrComputeAiJobMatches,
  markAiJobMatchEmptyCooldown,
  clearAiJobMatchEmptyCooldown,
} from '@/lib/admin/aiJobMatchCompute';
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
    persistMatches: (jid, matches) =>
      prisma.aIJobMatch.createMany({
        data: matches.map((m) => ({
          jobId: jid,
          studentId: m.studentId,
          matchScore: m.matchScore,
          matchReasons: m.matchReasons,
        })),
        skipDuplicates: true,
      }),
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
