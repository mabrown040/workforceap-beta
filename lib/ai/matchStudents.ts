import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import {
  MATCH_WEIGHTS,
  scoreProgramAlignment,
  scoreAssessmentReadiness,
  scoreCertifications,
  scoreCourseCompletion,
  scoreSkillsMatching,
} from './matchWeights';

export interface StudentMatch {
  studentId: string;
  matchScore: number;
  matchReasons: string[];
}

export async function matchStudentsForJob(job: {
  requirements: string[];
  suggestedPrograms: string[];
  preferredCertifications: string[];
}): Promise<StudentMatch[]> {
  const students = await prisma.user.findMany({
    where: {
      deletedAt: null,
      enrolledProgram: { not: null },
    },
    select: {
      id: true,
      fullName: true,
      enrolledProgram: true,
      assessmentScorePct: true,
      coursesCompleted: true,
      userCertifications: { select: { certName: true } },
      profile: { select: { city: true, state: true } },
    },
  });

  const progSlugs = new Set((job.suggestedPrograms ?? []).map((p) => p.toLowerCase()));
  const reqLower = (job.requirements ?? []).map((r) => r.toLowerCase());
  const certLower = (job.preferredCertifications ?? []).map((c) => c.toLowerCase());

  const scored: { student: (typeof students)[0]; score: number; reasons: string[] }[] = [];

  for (const s of students) {
    const reasons: string[] = [];
    let weightedSum = 0;

    const program = s.enrolledProgram ? getProgramBySlug(s.enrolledProgram) : null;
    const programSkills = program?.skills ?? [];

    const progResult = scoreProgramAlignment(s.enrolledProgram, progSlugs);
    if (progResult.reason) reasons.push(progResult.reason);
    weightedSum += MATCH_WEIGHTS.programAlignment * progResult.score;

    const assessResult = scoreAssessmentReadiness(s.assessmentScorePct ?? null);
    if (assessResult.reason) reasons.push(assessResult.reason);
    weightedSum += MATCH_WEIGHTS.assessmentReadiness * assessResult.score;

    const certs = (s.userCertifications ?? []).map((c) => c.certName);
    const certResult = scoreCertifications(certs, certLower);
    if (certResult.reason) reasons.push(certResult.reason);
    weightedSum += MATCH_WEIGHTS.certifications * certResult.score;

    const courses = (s.coursesCompleted as string[] | null) ?? [];
    const courseResult = scoreCourseCompletion(courses);
    if (courseResult.reason) reasons.push(courseResult.reason);
    weightedSum += MATCH_WEIGHTS.courseCompletion * courseResult.score;

    const skillsResult = scoreSkillsMatching(reqLower, programSkills);
    if (skillsResult.reason) reasons.push(skillsResult.reason);
    weightedSum += MATCH_WEIGHTS.skillsMatching * skillsResult.score;

    const score = Math.round(Math.min(100, weightedSum * 100));

    if (score > 0) {
      scored.push({
        student: s,
        score,
        reasons: [...new Set(reasons)],
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map(({ student, score, reasons }) => ({
    studentId: student.id,
    matchScore: score,
    matchReasons: reasons,
  }));
}
