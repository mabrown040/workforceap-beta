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
 * Encode the user's top interest areas into a short, shareable URL slug
 * (e.g. ['Investigative','Social'] → "investigative-social"). Used to personalize
 * the share card without persisting anything server-side.
 */
export function areasToTypeSlug(areas: (string | undefined)[]): string {
  const valid = (RIASEC_AREAS as readonly string[]).map((a) => a.toLowerCase());
  return areas
    .map((a) => (a ?? '').toLowerCase())
    .filter((a) => valid.includes(a))
    .slice(0, 2)
    .join('-');
}

/** Decode a `?type=` slug back into display labels, e.g. "Investigative & Social". Null if invalid. */
export function typeSlugToLabel(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const valid = (RIASEC_AREAS as readonly string[]).map((a) => a.toLowerCase());
  const parts = slug.toLowerCase().split('-').filter((p) => valid.includes(p)).slice(0, 2);
  if (parts.length === 0) return null;
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' & ');
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

export type CareerPlanTopCareer = {
  code?: string | null;
  title?: string | null;
};

export type CareerPlanStep = {
  key: 'target' | 'training' | 'commit';
  label: string;
  href?: string;
};

const SAFE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_ONET_CODE_PATTERN = /^\d{2}-\d{4}\.\d{2}$/;

function cleanDisplayText(value: string | null | undefined): string | null {
  const cleaned = (value ?? '').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : null;
}

function isSafeSlug(value: string | null | undefined): value is string {
  return SAFE_SLUG_PATTERN.test(value ?? '');
}

/**
 * Build the short, non-PII apply URL used by quiz result CTAs.
 * Only source/type/career/onet/program are serialized; raw answers/contact data never are.
 */
export function buildCareerPlanApplyHref({
  typeSlug,
  topCareer,
  programSlug,
}: {
  typeSlug?: string | null;
  topCareer?: CareerPlanTopCareer | null;
  programSlug?: string | null;
}): string {
  const params = new URLSearchParams({ source: 'career_quiz' });
  if (isSafeSlug(typeSlug)) params.set('type', typeSlug);

  const title = cleanDisplayText(topCareer?.title);
  if (title) params.set('career', title);

  const code = topCareer?.code?.trim();
  if (code && SAFE_ONET_CODE_PATTERN.test(code)) params.set('onet', code);
  if (isSafeSlug(programSlug)) params.set('program', programSlug);

  return `/apply?${params.toString()}`;
}

/** Commitment copy for Web Share/clipboard. Identity + action, not generic viral quiz text. */
export function buildCommitmentShareText({
  typeLabel,
  topCareerTitle,
  shareUrl,
}: {
  typeLabel?: string | null;
  topCareerTitle?: string | null;
  shareUrl?: string | null;
}): string {
  const career = cleanDisplayText(topCareerTitle) ?? 'a career that fits me';
  const type = cleanDisplayText(typeLabel);
  const url = cleanDisplayText(shareUrl);
  const typeSentence = type ? ` My career type is ${type}.` : '';
  const urlSentence = url ? ` Hold me to it: ${url}` : '';
  return `I'm committing to explore ${career} with WorkforceAP's no-cost training path.${typeSentence}${urlSentence}`;
}

/** Visible three-step plan shown after the quiz result. */
export function buildCareerPlanSteps({
  topCareerTitle,
  selectedProgramTitle,
  applyHref,
}: {
  topCareerTitle?: string | null;
  selectedProgramTitle?: string | null;
  applyHref: string;
}): CareerPlanStep[] {
  const career = cleanDisplayText(topCareerTitle) ?? 'your best-fit career';
  const program = cleanDisplayText(selectedProgramTitle) ?? 'Talk with a counselor';
  return [
    { key: 'target', label: `Pick your target: ${career}` },
    { key: 'training', label: `Start Step 1: ${program}`, href: applyHref },
    { key: 'commit', label: 'Make the commitment: save or share this plan and start your free application', href: applyHref },
  ];
}
