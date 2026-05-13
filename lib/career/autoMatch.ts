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
  technologies?: { technologyName: string }[];
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
    .filter((w) => w.length >= MIN_TOKEN_LENGTH);
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
    occ.technologies?.map((t) => t.technologyName).join(' ') ?? '',
  ].join(' ');
  return new Set(tokenize(blob));
}

/** Build the deduped keyword list for a program. */
export function buildProgramKeywords(prog: Program): string[] {
  const raw = [prog.title, prog.category, prog.categoryLabel, ...prog.skills, prog.partner].join(' ');
  return [...new Set(tokenize(raw))];
}

/**
 * Check whether two tokens are similar enough to count as a partial match.
 * Handles common stem variations: network ↔ networking, troubleshoot ↔ troubleshooting,
 * security ↔ cybersecurity, etc.
 */
function isPartialMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  // One is a prefix of the other (network / networking)
  if (a.startsWith(b) || b.startsWith(a)) return true;
  // One contains the other as a whole word segment
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

/** Count exact and partial keyword matches against an occupation token set. */
function countMatches(
  keywords: string[],
  occTokens: Set<string>
): { exact: number; partial: number; matchedTerms: string[] } {
  const exactTerms: string[] = [];
  const partialTerms: string[] = [];

  for (const kw of keywords) {
    let foundExact = false;
    for (const token of occTokens) {
      if (token === kw) {
        foundExact = true;
        break;
      }
    }
    if (foundExact) {
      exactTerms.push(kw);
      continue;
    }

    let foundPartial = false;
    for (const token of occTokens) {
      if (isPartialMatch(token, kw)) {
        foundPartial = true;
        break;
      }
    }
    if (foundPartial) {
      partialTerms.push(kw);
    }
  }

  return {
    exact: exactTerms.length,
    partial: partialTerms.length,
    matchedTerms: [...exactTerms, ...partialTerms],
  };
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

/** Infer an experience band from the occupation title and description tokens. */
function inferExperienceBand(occ: OccupationForMatch): AutoMatchResult['experienceBand'] {
  const text = [occ.title, occ.description ?? ''].join(' ').toLowerCase();
  if (/\b(entry[- ]?level|junior|trainee|assistant|intern|beginner)\b/.test(text)) return 'beginner';
  if (/\b(senior|lead|principal|manager|director|expert|specialist)\b/.test(text)) return 'experienced';
  return 'some_experience';
}

/** Score a single program against an occupation token set. */
export function scoreProgram(prog: Program, occTokens: Set<string>, occ?: OccupationForMatch): AutoMatchResult {
  const keywords = buildProgramKeywords(prog);
  const { exact, partial, matchedTerms } = countMatches(keywords, occTokens);
  const rawScore = keywords.length > 0 ? (exact + partial * 0.5) / keywords.length : 0;
  const score = Math.min(1, Math.round(rawScore * 1000) / 1000);
  const recommendationType = scoreToRecommendationType(score);
  const experienceBand = occ ? inferExperienceBand(occ) : 'beginner';

  const matchedDisplay = matchedTerms.slice(0, 5);
  let reason: string;
  if (exact > 0 && partial > 0) {
    reason = `Shares ${exact} exact keyword${exact !== 1 ? 's' : ''} and ${partial} related term${partial !== 1 ? 's' : ''}${matchedDisplay.length ? ` including ${matchedDisplay.join(', ')}` : ''}.`;
  } else if (exact > 0) {
    reason = `Shares ${exact} keyword${exact !== 1 ? 's' : ''}${matchedDisplay.length ? ` including ${matchedDisplay.join(', ')}` : ''}.`;
  } else if (partial > 0) {
    reason = `Partial overlap on ${partial} related term${partial !== 1 ? 's' : ''}${matchedDisplay.length ? ` including ${matchedDisplay.join(', ')}` : ''}.`;
  } else {
    reason = 'Low keyword overlap — stretch recommendation based on adjacent career pathway.';
  }

  return {
    programSlug: prog.slug,
    programTitle: prog.title,
    score,
    reason,
    recommendationType,
    experienceBand,
  };
}

/** Lower bound — programs scoring below this are dropped from the top-N list. */
export const MIN_INCLUDED_SCORE = 0.04;
/** Maximum number of matches returned to the admin UI. */
export const TOP_N = 8;

/**
 * Fallback title-only matcher when the full occupation record yields no results.
 * Compares occupation title tokens against program title + skills for quick matches.
 */
function rankProgramsByTitle(
  occ: OccupationForMatch,
  programs: ReadonlyArray<Program>
): AutoMatchResult[] {
  const titleTokens = new Set(tokenize(occ.title));
  if (titleTokens.size === 0) return [];

  return programs
    .map((p) => {
      const progTitleTokens = new Set(tokenize(p.title));
      const progSkillTokens = new Set(tokenize(p.skills.join(' ')));
      const allProgTokens = new Set([...progTitleTokens, ...progSkillTokens]);

      let exact = 0;
      let partial = 0;
      const matched: string[] = [];

      for (const token of titleTokens) {
        let hit = false;
        for (const pt of allProgTokens) {
          if (pt === token) {
            exact++;
            hit = true;
            break;
          }
          if (isPartialMatch(pt, token)) {
            partial++;
            hit = true;
            break;
          }
        }
        if (hit) matched.push(token);
      }

      const totalProgTokens = allProgTokens.size || 1;
      const score = Math.min(1, Math.round(((exact + partial * 0.5) / totalProgTokens) * 1000) / 1000);
      const matchedDisplay = matched.slice(0, 5);
      const reason =
        exact + partial > 0
          ? `Title match: shares ${exact + partial} term${exact + partial !== 1 ? 's' : ''}${matchedDisplay.length ? ` including ${matchedDisplay.join(', ')}` : ''}.`
          : 'Low title overlap — stretch recommendation.';

      return {
        programSlug: p.slug,
        programTitle: p.title,
        score,
        reason,
        recommendationType: scoreToRecommendationType(score),
        experienceBand: inferExperienceBand(occ),
      };
    })
    .filter((m) => m.score >= MIN_INCLUDED_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);
}

/** Run the full auto-match pipeline for an occupation against a program list. */
export function rankPrograms(
  occ: OccupationForMatch,
  programs: ReadonlyArray<Program>
): AutoMatchResult[] {
  const occTokens = buildOccupationTokens(occ);
  const ranked = programs
    .map((p) => scoreProgram(p, occTokens, occ))
    .filter((m) => m.score >= MIN_INCLUDED_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);

  // If full-data scoring yields nothing useful, fall back to title-only matching.
  if (ranked.length === 0) {
    return rankProgramsByTitle(occ, programs);
  }

  return ranked;
}
