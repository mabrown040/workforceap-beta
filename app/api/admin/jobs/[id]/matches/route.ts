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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    select: { id: true, title: true, requirements: true, suggestedPrograms: true, preferredCertifications: true },
  });

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const cached = await prisma.aIJobMatch.findMany({
    where: { jobId: id },
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
  });

  if (cached.length > 0) {
    try {
      await recordWorkflowDiagnostic({
        workflow: 'admin_job_matches',
        status: 'inspection',
        actorUserId: user.id,
        entityType: 'job',
        entityId: id,
        summary: `Admin opened cached AI matches (${cached.length})`,
        method: 'cache',
        metadata: { count: cached.length },
      });
    } catch (err) {
      console.error('[admin_job_matches] recordWorkflowDiagnostic failed', {
        jobId: id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return NextResponse.json(
      cached.map((m) => ({
        studentId: m.studentId,
        matchScore: m.matchScore,
        matchReasons: m.matchReasons,
        status: m.status,
        student: m.student,
      }))
    );
  }

  const matches = await getOrComputeAiJobMatches(id, job);
  try {
    await recordWorkflowDiagnostic({
      workflow: 'admin_job_matches',
      status: matches.length > 0 ? 'success' : 'fallback',
      actorUserId: user.id,
      entityType: 'job',
      entityId: id,
      summary: matches.length > 0 ? `Generated ${matches.length} AI matches` : 'AI matching returned zero matches',
      method: 'generated',
      fallbackPath: matches.length > 0 ? null : 'no_matches',
      metadata: { count: matches.length },
    });
  } catch (err) {
    console.error('[admin_job_matches] recordWorkflowDiagnostic failed', {
      jobId: id,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  if (matches.length === 0) {
    markAiJobMatchEmptyCooldown(id);
    return NextResponse.json([]);
  }

  clearAiJobMatchEmptyCooldown(id);

  try {
    await prisma.aIJobMatch.createMany({
      data: matches.map((m) => ({
        jobId: id,
        studentId: m.studentId,
        matchScore: m.matchScore,
        matchReasons: m.matchReasons,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    console.error('[admin_job_matches] createMany failed', {
      jobId: id,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  const updated = await prisma.aIJobMatch.findMany({
    where: { jobId: id },
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
  });

  return NextResponse.json(
    updated.map((m) => ({
      studentId: m.studentId,
      matchScore: m.matchScore,
      matchReasons: m.matchReasons,
      status: m.status,
      student: m.student,
    }))
  );
}
