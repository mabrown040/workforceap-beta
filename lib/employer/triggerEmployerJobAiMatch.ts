import { prisma } from '@/lib/db/prisma';
import { recordWorkflowDiagnostic } from '@/lib/diagnostics';
import {
  getOrComputeAiJobMatches,
  markAiJobMatchEmptyCooldown,
  clearAiJobMatchEmptyCooldown,
} from '@/lib/admin/aiJobMatchCompute';
import { runAdminJobMatchesGet } from '@/lib/admin/runAdminJobMatchesGet';

/**
 * Fire-and-forget AI candidate matching when a job becomes live (admin approval or future employer go-live).
 * Does not block the HTTP response that triggered it.
 */
export function scheduleAiMatchForLiveJob(jobId: string): void {
  setImmediate(() => {
    void (async () => {
      try {
        const result = await runAdminJobMatchesGet(jobId, {
          findJobForMatch: (jid) =>
            prisma.job.findUnique({
              where: { id: jid },
              select: {
                id: true,
                title: true,
                requirements: true,
                suggestedPrograms: true,
                preferredCertifications: true,
              },
            }),
          findCachedRows: (jid) =>
            prisma.aIJobMatch.findMany({
              where: { jobId: jid },
              include: {
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
              },
              orderBy: { matchScore: 'desc' },
              take: 10,
            }),
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
          reloadRows: (jid) =>
            prisma.aIJobMatch.findMany({
              where: { jobId: jid },
              include: {
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
              },
              orderBy: { matchScore: 'desc' },
              take: 10,
            }),
          markEmptyCooldown: markAiJobMatchEmptyCooldown,
          clearEmptyCooldown: clearAiJobMatchEmptyCooldown,
          logDiagnostic: (input) =>
            recordWorkflowDiagnostic({
              workflow: 'employer_job_live_auto_match',
              actorUserId: null,
              entityType: 'job',
              entityId: jobId,
              status: input.status,
              summary: input.summary,
              method: input.method,
              fallbackPath: input.fallbackPath ?? null,
              metadata: input.metadata ? { ...input.metadata, jobId } : { jobId },
            }),
        });

        if ('notFound' in result && result.notFound) {
          console.error(`[employer_match_auto] jobId=${jobId} error=job not found`);
          return;
        }

        const count =
          'body' in result && Array.isArray(result.body) ? result.body.length : 0;
        console.log(`[employer_match_auto] jobId=${jobId} triggered matches=${count}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[employer_match_auto] jobId=${jobId} error=${msg}`);
      }
    })();
  });
}
