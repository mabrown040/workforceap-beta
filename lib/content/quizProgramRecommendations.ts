/**
 * Shared program ordering from quiz weights + experience ramp (Find Your Path + O*NET recommend).
 */
import { PROGRAMS, getProgramBySlug, type Program } from '@/lib/content/programs';
import type { CategoryWeights, QuizAnswers } from '@/lib/content/quizScoring';
import { ANCHOR_DIGITAL_LITERACY_SLUG, ANCHOR_IT_SUPPORT_SLUG } from '@/lib/onet/programAnchors';

export function getTopProgramsFromQuiz(weights: CategoryWeights, answers: QuizAnswers): Program[] {
  const scored = PROGRAMS.map((p) => {
    const score = weights[p.category as keyof CategoryWeights] ?? 0;
    const salaryMatch = p.salary.match(/\$(\d+)K/);
    const salaryNum = salaryMatch ? parseInt(salaryMatch[1], 10) : 0;
    return { program: p, score, salaryNum };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.salaryNum - a.salaryNum;
  });

  const topMatches = scored.filter((s) => s.score > 0);
  const goalProgram = topMatches[0]?.program;

  const digital = getProgramBySlug(ANCHOR_DIGITAL_LITERACY_SLUG);
  const itSupport = getProgramBySlug(ANCHOR_IT_SUPPORT_SLUG);

  const experienceLevel = answers.q2;
  const needsDigital =
    answers.q6 === 'no_computer' ||
    answers.q6 === 'needs_device' ||
    answers.q5 === 'basics' ||
    answers.q5 === 'basic_apps';

  const result: Program[] = [];

  if (experienceLevel === 'brand_new') {
    if (needsDigital && digital) result.push(digital);
    if (itSupport) result.push(itSupport);
    if (goalProgram && !result.find((p) => p.slug === goalProgram.slug)) {
      result.push(goalProgram);
    }
  } else if (experienceLevel === 'some_knowledge') {
    if (itSupport) result.push(itSupport);
    if (goalProgram && !result.find((p) => p.slug === goalProgram.slug)) {
      result.push(goalProgram);
    }
  } else {
    if (goalProgram) result.push(goalProgram);
  }

  let idx = 0;
  while (result.length < 3 && idx < scored.length) {
    const prog = scored[idx].program;
    if (!result.find((p) => p.slug === prog.slug)) {
      result.push(prog);
    }
    idx++;
  }

  return result.slice(0, 3);
}
