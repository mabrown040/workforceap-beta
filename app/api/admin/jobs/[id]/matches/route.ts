import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { recordWorkflowDiagnostic } from '@/lib/diagnostics';
import {
  getOrComputeAiJobMatches,
  markAiJobMatchEmptyCooldown,
  clearAiJobMatchEmptyCooldown,
} from '@/lib/admin/aiJobMatchCompute';
import { runAdminJobMatchesGet } from '@/lib/admin/runAdminJobMatchesGet';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: jobId } = await params;

  const result = await runAdminJobMatchesGet(jobId, {
    findJobForMatch: (jid) =>
      prisma.job.findUnique({
        where: { id: jid },
        select: { id: true, title: true, requirements: true, suggestedPrograms: true, preferredCertifications: true },
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
        workflow: 'admin_job_matches',
        actorUserId: user.id,
        entityType: 'job',
        entityId: jobId,
        status: input.status,
        summary: input.summary,
        method: input.method,
        fallbackPath: input.fallbackPath ?? null,
        metadata: input.metadata ?? null,
      }),
  });

  if ('notFound' in result && result.notFound) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  const ok = result as { status: 200; body: unknown };
  return NextResponse.json(ok.body);
}
