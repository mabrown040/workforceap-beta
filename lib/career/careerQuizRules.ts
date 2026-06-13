/**
 * Short public "career quiz" (#4) — a low-friction, top-of-funnel lead magnet.
 *
 * Distinct from the full 30-question public Interest Profiler (#1680): this asks
 * ONE question per RIASEC interest area (6 total), then expands those 6 ratings
 * into the 30-item answer vector O*NET expects, so it can reuse the exact same
 * scoring + career-matching pipeline the profiler uses.
 *
 * Pure module — no DB / `server-only` imports, so the expansion logic is unit-tested.
 */

/** O*NET interest-area titles, in canonical RIASEC order. Must match `interest.title`. */
export const RIASEC_AREAS = [
  'Realistic',
  'Investigative',
  'Artistic',
  'Social',
  'Enterprising',
  'Conventional',
] as const;
export type RiasecArea = (typeof RIASEC_AREAS)[number];

export type QuizQuestion = { id: RiasecArea; prompt: string };

/** One friendly activity prompt per area. Answered on a 1–5 enjoyment scale. */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: 'Realistic', prompt: 'Build, fix, or work hands-on with tools, machines, or the outdoors.' },
  { id: 'Investigative', prompt: 'Dig into problems — research, analyze, and figure out how things work.' },
  { id: 'Artistic', prompt: 'Create, design, or express ideas in original ways.' },
  { id: 'Social', prompt: 'Help, teach, coach, or support other people.' },
  { id: 'Enterprising', prompt: 'Lead, persuade, sell, or start something of your own.' },
  { id: 'Conventional', prompt: 'Organize information, follow clear systems, and keep things accurate.' },
];

/** Enjoyment scale labels for the 1–5 answers (index 0 unused). */
export const SCALE_LABELS = ['', 'Dislike', 'Slightly dislike', 'Neutral', 'Like', 'Love it'] as const;

const ANSWER_PATTERN = /^[1-5]{6}$/;
const ONET_ANSWER_PATTERN = /^[1-5]{30}$/;

/** Validate the raw 6-char quiz answer string (one digit per area, in RIASEC_AREAS order). */
export function isValidQuizAnswers(raw: string | null | undefined): boolean {
  return ANSWER_PATTERN.test(raw ?? '');
}

/**
 * Expand the 6 area ratings into the 30-character O*NET answer string.
 *
 * @param quizAnswers  6 chars [1-5], one per area in RIASEC_AREAS order.
 * @param positionAreas  the interest-area title for each of O*NET's 30 items, in order.
 * @returns a 30-char [1-5] string, or null if the inputs are unusable.
 *
 * Each O*NET item inherits the rating its area received in the quiz. Items whose
 * area we can't resolve fall back to a neutral 3 so the string stays well-formed.
 */
export function areaScoresToOnetAnswers(
  quizAnswers: string,
  positionAreas: (string | undefined)[]
): string | null {
  if (!isValidQuizAnswers(quizAnswers)) return null;
  if (positionAreas.length !== 30) return null;

  const byArea = new Map<string, string>();
  RIASEC_AREAS.forEach((area, i) => byArea.set(area, quizAnswers[i]));

  const out = positionAreas.map((area) => (area && byArea.get(area)) || '3').join('');
  return ONET_ANSWER_PATTERN.test(out) ? out : null;
}
