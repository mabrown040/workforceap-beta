/**
 * Pure scoring helpers for the O*NET → WorkforceAP program auto-match feature.
 *
 * Extracted from `app/api/admin/onet/auto-match/route.ts` so the scoring rules
 * (token tokenization, overlap ratio, recommendationType buckets, top-N cutoff)
 * can be unit tested in isolation without a database or Next request.
 *
 * The scoring stays intentionally simple: whole-word overlap between the
 * occupation's metadata tokens and each program's keyword tokens. Anything more
 * elaborate (semantic embeddings, weighted skills) belongs in a separate
 * scorer — keep this one transparent for compliance/audit conversations.
 */

import type { Program } from '@/lib/content/programs';

/** Minimal, non-DB shape of an O*NET occupation needed for scoring. */
export type OccupationForMatch = {
  title: string;
  description?: string | null;
  jobFamily?: string | null;
  outlookSummary?: string | null;
  skills: { skillName: string }[];
  tasks: { taskText: string }[];
};

export type AutoMatchResult = {
  programSlug: string;
  programTitle: string;
  /** Overlap ratio in [0, 1], rounded to 3 decimal places. */
  score: number;
  reason: string;
  recommendationType: 'primary' | 'bridge' | 'stretch';
  experienceBand: 'beginner' | 'some_experience' | 'experienced';
};

/** Tokens shorter than this are dropped (matches the original route behavior). */
const MIN_TOKEN_LENGTH = 4;

/** Tokenize free text into a lowercased whole-word set, dropping short tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > MIN_TOKEN_LENGTH - 1);
}

/** Build the occupation token set used for overlap scoring. */
export function buildOccupationTokens(occ: OccupationForMatch): Set<string> {
  const blob = [
    occ.title,
    occ.description ?? '',
    occ.jobFamily ?? '',
    occ.outlookSummary ?? '',
    occ.skills.map((s) => s.skillName).join(' '),
    occ.tasks.map((t) => t.taskText).join(' '),
  ].join(' ');
  return new Set(tokenize(blob));
}

/** Build the deduped keyword list for a program. */
export function buildProgramKeywords(prog: Program): string[] {
  const raw = [prog.title, prog.category, prog.categoryLabel, ...prog.skills, prog.partner].join(' ');
  return [...new Set(tokenize(raw))];
}

/**
 * Convert a raw overlap score into a recommendation tier.
 * Boundaries match the original API route so scoring is consistent.
 */
export function scoreToRecommendationType(score: number): AutoMatchResult['recommendationType'] {
  if (score >= 0.25) return 'primary';
  if (score >= 0.1) return 'bridge';
  return 'stretch';
}

/** Score a single program against an occupation token set. */
export function scoreProgram(prog: Program, occTokens: Set<string>): AutoMatchResult {
  const keywords = buildProgramKeywords(prog);
  const hits = keywords.filter((kw) => occTokens.has(kw));
  const rawScore = keywords.length > 0 ? hits.length / keywords.length : 0;
  const score = Math.round(rawScore * 1000) / 1000;
  const recommendationType = scoreToRecommendationType(score);

  const matchedTerms = hits.slice(0, 5);
  const reason =
    hits.length > 0
      ? `${hits.length} keyword match${hits.length !== 1 ? 'es' : ''}: ${matchedTerms.join(', ')}${hits.length > 5 ? ', …' : ''}.`
      : 'Low keyword overlap — stretch recommendation based on adjacent skills.';

  return {
    programSlug: prog.slug,
    programTitle: prog.title,
    score,
    reason,
    recommendationType,
    experienceBand: 'beginner',
  };
}

/** Lower bound — programs scoring below this are dropped from the top-N list. */
export const MIN_INCLUDED_SCORE = 0.04;
/** Maximum number of matches returned to the admin UI. */
export const TOP_N = 8;

/** Run the full auto-match pipeline for an occupation against a program list. */
export function rankPrograms(
  occ: OccupationForMatch,
  programs: ReadonlyArray<Program>
): AutoMatchResult[] {
  const occTokens = buildOccupationTokens(occ);
  return programs
    .map((p) => scoreProgram(p, occTokens))
    .filter((m) => m.score >= MIN_INCLUDED_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);
}
