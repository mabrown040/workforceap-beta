import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import {
  MATCH_WEIGHTS,
  scoreProgramAlignment,
  scoreAssessmentReadiness,
  scoreCertifications,
  scoreCourseCompletion,
  scoreSkillsMatching,
} from '@/lib/ai/matchWeights';

/**
 * GET /api/member/matched-jobs
 * Returns top 5 active jobs matched to the current student's profile.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id, deletedAt: null },
    select: {
      enrolledProgram: true,
      assessmentScorePct: true,
      coursesCompleted: true,
      userCertifications: { select: { certName: true } },
    },
  });

  if (!dbUser) return NextResponse.json({ jobs: [] });

  // Fetch active/approved jobs
  const jobs = await prisma.job.findMany({
    where: {
      status: { in: ['approved', 'live'] },
    },
    include: {
      employer: { select: { companyName: true } },
    },
  });

  const program = dbUser.enrolledProgram ? getProgramBySlug(dbUser.enrolledProgram) : null;
  const programSkills = program?.skills ?? [];
  const certs = (dbUser.userCertifications ?? []).map((c) => c.certName);
  const courses = (dbUser.coursesCompleted as string[] | null) ?? [];

  const scored = jobs.map((job) => {
    const progSlugs = new Set((job.suggestedPrograms ?? []).map((p) => p.toLowerCase()));
    const reqLower = (job.requirements ?? []).map((r) => r.toLowerCase());
    const certLower = (job.preferredCertifications ?? []).map((c) => c.toLowerCase());

    let weightedSum = 0;
    weightedSum += MATCH_WEIGHTS.programAlignment * scoreProgramAlignment(dbUser.enrolledProgram, progSlugs).score;
    weightedSum += MATCH_WEIGHTS.assessmentReadiness * scoreAssessmentReadiness(dbUser.assessmentScorePct ?? null).score;
    weightedSum += MATCH_WEIGHTS.certifications * scoreCertifications(certs, certLower).score;
    weightedSum += MATCH_WEIGHTS.courseCompletion * scoreCourseCompletion(courses).score;
    weightedSum += MATCH_WEIGHTS.skillsMatching * scoreSkillsMatching(reqLower, programSkills).score;

    const matchPct = Math.round(Math.min(100, weightedSum * 100));

    return {
      id: job.id,
      title: job.title,
      company: job.employer.companyName,
      location: job.location ?? 'Remote',
      locationType: job.locationType,
      matchPct,
    };
  });

  scored.sort((a, b) => b.matchPct - a.matchPct);

  return NextResponse.json({ jobs: scored.slice(0, 5) });
}
