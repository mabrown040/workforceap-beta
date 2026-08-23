import type { CareerExperienceBand, CareerRecommendationType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { LOOKUP_CATALOG_CAP } from '@/lib/db/scanCaps';
import { getProgramBySlug, type Program } from '@/lib/content/programs';
import { scoreQuiz, type QuizAnswers } from '@/lib/content/quizScoring';
import { getFitReasoning } from '@/lib/content/quizReasoning';
import { getTopProgramsFromQuiz } from '@/lib/content/quizProgramRecommendations';
import { translateOccupationDescription, translateSkillName, translateTaskLine } from '@/lib/onet/copy';
import { getOccupation } from '@/lib/onet/client';
import { ONET_CODE_PATTERN, resolveOccupationTitle } from '@/lib/onet/occupationTitles';
import type { CareerMatchResult, ExperienceBandUi } from '@/lib/onet/types';
import { ANCHOR_DIGITAL_LITERACY_SLUG, ANCHOR_IT_SUPPORT_SLUG } from '@/lib/onet/programAnchors';
import { mergeRiasecIntoWeights, type InterestProfilerRiasec } from '@/lib/content/quizIpMerge';

function mapQ2ToExperienceBand(q2: QuizAnswers['q2']): ExperienceBandUi {
  switch (q2) {
    case 'brand_new':
      return 'beginner';
    case 'some_knowledge':
      return 'some_experience';
    default:
      return 'experienced';
  }
}

function uiBandToPrisma(b: ExperienceBandUi): CareerExperienceBand {
  if (b === 'beginner') return 'beginner';
  if (b === 'some_experience') return 'some_experience';
  return 'experienced';
}

function needsComputerSupport(answers: QuizAnswers): boolean {
  return answers.q6 === 'no_computer' || answers.q6 === 'needs_device';
}

function needsDigitalLiteracyFirst(answers: QuizAnswers): boolean {
  return (
    answers.q6 === 'no_computer' ||
    answers.q6 === 'needs_device' ||
    answers.q5 === 'basics' ||
    answers.q5 === 'basic_apps'
  );
}

function sortRecType(a: CareerRecommendationType, b: CareerRecommendationType): number {
  const order: CareerRecommendationType[] = ['primary', 'bridge', 'stretch'];
  return order.indexOf(a) - order.indexOf(b);
}

/** Build ordered program recommendations (slugs) using transcript ramp + goal program. */
export function buildProgramPathFromGoal(
  experienceBand: ExperienceBandUi,
  goalProgram: Program | undefined,
  answers: QuizAnswers
): { slug: string; recommendationType: 'primary' | 'bridge' | 'stretch'; whyRecommended: string }[] {
  const digital = getProgramBySlug(ANCHOR_DIGITAL_LITERACY_SLUG);
  const itSupport = getProgramBySlug(ANCHOR_IT_SUPPORT_SLUG);
  const goal = goalProgram;
  const out: { slug: string; recommendationType: 'primary' | 'bridge' | 'stretch'; whyRecommended: string }[] = [];

  const pushUnique = (
    slug: string,
    type: 'primary' | 'bridge' | 'stretch',
    why: string
  ) => {
    if (!getProgramBySlug(slug)) return;
    if (out.some((o) => o.slug === slug)) return;
    out.push({ slug, recommendationType: type, whyRecommended: why });
  };

  if (experienceBand === 'beginner') {
    if (needsDigitalLiteracyFirst(answers) && digital) {
      pushUnique(
        digital.slug,
        'bridge',
        'Build confidence with devices, email, and online basics before heavier technical coursework.'
      );
    }
    if (itSupport) {
      pushUnique(
        itSupport.slug,
        'bridge',
        'Strengthen core IT support skills that employers expect in help desk and technician roles.'
      );
    }
    if (goal) {
      pushUnique(goal.slug, 'primary', 'This is your main training track based on your interests and goals.');
    }
  } else if (experienceBand === 'some_experience') {
    if (itSupport) {
      pushUnique(
        itSupport.slug,
        'bridge',
        'Formalize your troubleshooting and customer-support skills with a recognized credential.'
      );
    }
    if (goal) {
      pushUnique(goal.slug, 'primary', 'Your top match for the career direction you selected.');
    }
  } else if (goal) {
    pushUnique(goal.slug, 'primary', 'You have experience — this program focuses on advancing your credential.');
  }

  return out.slice(0, 6);
}

function ruleMatches(signal: Record<string, unknown>, answers: QuizAnswers): boolean {
  return Object.entries(signal).every(([k, v]) => {
    const key = k as keyof QuizAnswers;
    if (!(key in answers)) return false;
    return (answers as Record<string, string>)[key] === v;
  });
}

export async function buildCareerMatchResult(
  answers: QuizAnswers,
  options?: { ipRiasec?: InterestProfilerRiasec | null }
): Promise<CareerMatchResult> {
  let weights = scoreQuiz(answers);
  if (options?.ipRiasec) {
    weights = mergeRiasecIntoWeights(weights, options.ipRiasec);
  }
  const experienceBand = mapQ2ToExperienceBand(answers.q2);
  const prismaBand = uiBandToPrisma(experienceBand);
  const supportFlags = { needsComputerSupport: needsComputerSupport(answers) };

  const rules = await prisma.careerQuizRule.findMany({ take: LOOKUP_CATALOG_CAP, where: { isActive: true } });
  const boostMap = new Map<string, number>();
  for (const r of rules) {
    const sig = r.inputSignal as Record<string, unknown>;
    if (ruleMatches(sig, answers)) {
      boostMap.set(r.boostOnetCode, (boostMap.get(r.boostOnetCode) ?? 0) + r.weight);
    }
  }

  const mappings = await prisma.careerProgramMapping.findMany({
    take: LOOKUP_CATALOG_CAP,
    where: { isActive: true, experienceBand: prismaBand },
    include: { occupation: true },
  });

  if (mappings.length === 0) {
    return fallbackCareerMatchResult(answers, weights, experienceBand, supportFlags);
  }

  const byOnet = new Map<string, typeof mappings>();
  for (const m of mappings) {
    const list = byOnet.get(m.onetCode) ?? [];
    list.push(m);
    byOnet.set(m.onetCode, list);
  }

  const scores = new Map<string, number>();
  for (const [onetCode, list] of byOnet) {
    let best = 0;
    for (const m of list) {
      const p = getProgramBySlug(m.programSlug);
      if (!p) continue;
      const w = weights[p.category as keyof typeof weights] ?? 0;
      const pri = m.priority <= 0 ? 1 : 1 / m.priority;
      best = Math.max(best, w * pri + (boostMap.get(onetCode) ?? 0));
    }
    if (best > 0) scores.set(onetCode, best);
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (ranked.length === 0) {
    return fallbackCareerMatchResult(answers, weights, experienceBand, supportFlags);
  }

  const topCodes = ranked.slice(0, 3).map(([c]) => c);

  // Batch fetch all top occupations + their related titles in two queries.
  const occs = await prisma.onetOccupation.findMany({
    where: { onetCode: { in: topCodes } },
    include: {
      skills: { take: 8, orderBy: { importance: 'desc' } },
      tasks: { take: 5 },
      relatedFrom: { take: 6 },
    },
  });
  const occMap = new Map(occs.map((o) => [o.onetCode, o]));

  const allRelatedCodes = [...new Set(occs.flatMap((o) => o.relatedFrom.slice(0, 3).map((r) => r.relatedOnetCode)))];
  const relatedOccs = allRelatedCodes.length
    ? await prisma.onetOccupation.findMany({
        where: { onetCode: { in: allRelatedCodes } },
        select: { onetCode: true, title: true },
      })
    : [];
  const relatedTitleMap = new Map(relatedOccs.map((o) => [o.onetCode, o.title]));

  const topOccupations: CareerMatchResult['topOccupations'] = [];

  for (let i = 0; i < topCodes.length; i++) {
    const code = topCodes[i];
    const conf = ranked.find(([c]) => c === code)?.[1] ?? 0;
    const occ = occMap.get(code);
    if (!occ) continue;

    // Self-healing: if the stored title is just the O*NET code, fetch the real
    // title from O*NET so users do not see raw codes like "15-1252.00".
    let occupationTitle = occ.title;
    if (!occupationTitle || ONET_CODE_PATTERN.test(occupationTitle)) {
      const fresh = await getOccupation(code).catch(() => null);
      if (fresh?.title && !ONET_CODE_PATTERN.test(fresh.title)) {
        occupationTitle = fresh.title;
      }
    }
    // Local fallback so we never surface a raw SOC code as a role title
    // (e.g. when ONET_API_KEY is unset or the API call failed above).
    if (!occupationTitle || ONET_CODE_PATTERN.test(occupationTitle)) {
      const fallback = resolveOccupationTitle(code, occupationTitle);
      if (fallback) occupationTitle = fallback;
    }

    const relatedTitles = occ.relatedFrom.slice(0, 3).map((r) =>
      relatedTitleMap.get(r.relatedOnetCode) ?? r.relatedOnetCode
    );

    const whyFit: string[] = [];
    const listForCode = byOnet.get(code) ?? [];
    const primaryMap = [...listForCode].sort((a, b) => {
      const p = a.priority - b.priority;
      if (p !== 0) return p;
      return sortRecType(a.recommendationType, b.recommendationType);
    })[0];
    if (primaryMap?.whyRecommended) whyFit.push(primaryMap.whyRecommended);
    const prog = primaryMap ? getProgramBySlug(primaryMap.programSlug) : undefined;
    if (prog) {
      const fr = getFitReasoning(prog, answers);
      if (fr) whyFit.push(fr);
    }
    if (whyFit.length === 0) {
      whyFit.push('This role lines up with your strengths in technology and the career direction you want.');
    }

    topOccupations.push({
      onetCode: code,
      title: occupationTitle,
      description: translateOccupationDescription(occ.description, occupationTitle),
      confidence: Math.min(0.98, 0.55 + conf * 0.08 + (i === 0 ? 0.1 : 0)),
      whyFit: whyFit.slice(0, 3),
      commonTasks: occ.tasks.map((t) => translateTaskLine(t.taskText)).filter(Boolean),
      skills: occ.skills.map((s) => translateSkillName(s.skillName)),
      relatedRoles: relatedTitles.filter(Boolean),
    });
  }

  const goalSlug =
    topOccupations[0] &&
    (byOnet.get(topOccupations[0].onetCode) ?? []).sort((a, b) => a.priority - b.priority)[0]?.programSlug;
  const goalProgram = goalSlug ? getProgramBySlug(goalSlug) : undefined;

  const path = buildProgramPathFromGoal(experienceBand, goalProgram, answers);
  const recommendedPrograms: CareerMatchResult['recommendedPrograms'] = path.map((p, idx) => ({
    programSlug: p.slug,
    priority: idx + 1,
    recommendationType: p.recommendationType,
    whyRecommended: p.whyRecommended,
  }));

  if (topOccupations.length === 0) {
    return fallbackCareerMatchResult(answers, weights, experienceBand, supportFlags);
  }

  return {
    topOccupations,
    recommendedPrograms,
    experienceBand,
    supportFlags,
  };
}

function fallbackCareerMatchResult(
  answers: QuizAnswers,
  weights: ReturnType<typeof scoreQuiz>,
  experienceBand: ExperienceBandUi,
  supportFlags: CareerMatchResult['supportFlags']
): CareerMatchResult {
  const programs = getTopProgramsFromQuiz(weights, answers);
  const goalProgram = programs[0];
  const path = buildProgramPathFromGoal(experienceBand, goalProgram, answers);
  const recommendedPrograms = path.map((p, idx) => ({
    programSlug: p.slug,
    priority: idx + 1,
    recommendationType: p.recommendationType,
    whyRecommended: p.whyRecommended,
  }));

  const topOccupations = programs.slice(0, 3).map((p, i) => ({
    onetCode: `local:${p.slug}`,
    title: p.title,
    description: translateOccupationDescription(null, p.title),
    confidence: 0.88 - i * 0.06,
    whyFit: [getFitReasoning(p, answers) ?? 'This program matches your answers and timeline.'].filter(Boolean),
    commonTasks: p.skills.slice(0, 4).map((s) => translateTaskLine(`Build skills in ${s}.`)),
    skills: p.skills.slice(0, 6),
    relatedRoles: [] as string[],
  }));

  return {
    topOccupations,
    recommendedPrograms,
    experienceBand,
    supportFlags,
  };
}
