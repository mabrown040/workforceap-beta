import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';

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

  const reqLower = job.requirements.map((r) => r.toLowerCase());
  const certLower = (job.preferredCertifications ?? []).map((c) => c.toLowerCase());
  const progSlugs = new Set((job.suggestedPrograms ?? []).map((p) => p.toLowerCase()));

  const scored: { student: (typeof students)[0]; score: number; reasons: string[] }[] = [];

  for (const s of students) {
    let score = 0;
    const reasons: string[] = [];

    const program = s.enrolledProgram ? PROGRAMS.find((p) => p.slug === s.enrolledProgram) : null;
    if (program && progSlugs.has(program.slug.toLowerCase())) {
      score += 30;
      reasons.push(`Enrolled in ${program.title}`);
    } else if (s.enrolledProgram) {
      score += 10;
      reasons.push(`Enrolled in ${s.enrolledProgram}`);
    }

    if (s.assessmentScorePct != null && s.assessmentScorePct >= 70) {
      score += 15;
      reasons.push(`Assessment score ${s.assessmentScorePct}%`);
    }

    const certs = (s.userCertifications ?? []).map((c) => c.certName.toLowerCase());
    for (const want of certLower) {
      if (certs.some((c) => c.includes(want) || want.includes(c))) {
        score += 20;
        reasons.push(`Has certification: ${want}`);
        break;
      }
    }

    const courses = (s.coursesCompleted as string[] | null) ?? [];
    if (courses.length >= 3) {
      score += 10;
      reasons.push(`${courses.length} courses completed`);
    }

    for (const req of reqLower) {
      const words = req.split(/\s+/).filter((w) => w.length > 3);
      for (const word of words) {
        if (program?.skills.some((sk) => sk.toLowerCase().includes(word))) {
          score += 5;
          reasons.push(`Relevant skill: ${word}`);
          break;
        }
      }
    }

    if (score > 0) {
      scored.push({ student: s, score: Math.min(100, score), reasons: [...new Set(reasons)] });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map(({ student, score, reasons }) => ({
    studentId: student.id,
    matchScore: score,
    matchReasons: reasons,
  }));
}
