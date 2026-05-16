/**
 * Blend O*NET Interest Profiler (RIASEC) scores into Find Your Path category weights
 * and into the Skill Mapper radar axes.
 */

import type { CategoryWeights } from '@/lib/content/quizScoring';

export type InterestProfilerRiasec = {
  realistic: number;
  investigative: number;
  artistic: number;
  social: number;
  enterprising: number;
  conventional: number;
};

export const INTEREST_PROFILER_STORAGE_KEY = 'workforceap_interest_profiler_v1';

/**
 * The Mini Interest Profiler (30-question form) asks 5 questions per RIASEC
 * dimension on a 1–5 Likert scale, so the theoretical max per dimension is 25.
 * Used as the absolute denominator when mapping RIASEC → radar so that scores
 * are comparable across members and against occupation profiles (which are
 * also expressed on an absolute 0–100 scale).
 */
export const MINI_IP_MAX_PER_DIMENSION = 25;

/** Radar axes that the Skill Mapper renders. Keep in sync with `RADAR_AXES` in `/api/member/skill-profile`. */
export const SKILL_MAPPER_RADAR_AXES = [
  'Analytics',
  'Engineering',
  'Design',
  'Strategy',
  'Ethics',
  'Research',
] as const;
export type SkillMapperRadarAxis = (typeof SKILL_MAPPER_RADAR_AXES)[number];

export type StoredInterestProfilerV1 = {
  version: 1;
  answers: string;
  riasec: InterestProfilerRiasec;
  completedAt: string;
};

/** Normalize RIASEC scores to 0–1 using each user's max — for relative ranking only. */
function normRelative(r: InterestProfilerRiasec): Record<keyof InterestProfilerRiasec, number> {
  const vals = Object.values(r);
  const max = Math.max(...vals, 1);
  return {
    realistic: r.realistic / max,
    investigative: r.investigative / max,
    artistic: r.artistic / max,
    social: r.social / max,
    enterprising: r.enterprising / max,
    conventional: r.conventional / max,
  };
}

/**
 * Additive blend — keeps quiz scores and adds a modest RIASEC-aligned nudge for program ranking.
 * Tuned for WorkforceAP program categories (tech, data, health, mfg, business, digital literacy).
 *
 * Uses relative normalization (the dominant interest gets the strongest nudge) because the
 * downstream consumer is a program *ranker*, not a comparison against an absolute target.
 */
export function mergeRiasecIntoWeights(base: CategoryWeights, riasec: InterestProfilerRiasec): CategoryWeights {
  const n = normRelative(riasec);
  const blend = 2.2;
  const out: CategoryWeights = { ...base };

  out['it-cyber'] += blend * (n.investigative * 0.45 + n.realistic * 0.25);
  out['ai-software'] += blend * (n.investigative * 0.4 + n.artistic * 0.2);
  out['cloud-data'] += blend * (n.investigative * 0.35 + n.conventional * 0.35);
  out.business += blend * (n.enterprising * 0.5 + n.conventional * 0.25 + n.social * 0.15);
  out.healthcare += blend * (n.social * 0.55);
  out.manufacturing += blend * (n.realistic * 0.55 + n.conventional * 0.15);
  out['digital-literacy'] += blend * (n.social * 0.15 + n.enterprising * 0.1 + n.artistic * 0.1);

  return out;
}

export function riasecFromResultRows(
  rows: { code: string; score: number }[]
): InterestProfilerRiasec | null {
  const keys: (keyof InterestProfilerRiasec)[] = [
    'realistic',
    'investigative',
    'artistic',
    'social',
    'enterprising',
    'conventional',
  ];
  const out: InterestProfilerRiasec = {
    realistic: 0,
    investigative: 0,
    artistic: 0,
    social: 0,
    enterprising: 0,
    conventional: 0,
  };
  for (const row of rows) {
    const k = row.code.toLowerCase() as keyof InterestProfilerRiasec;
    if (keys.includes(k)) out[k] = row.score;
  }
  if (Object.values(out).every((v) => v === 0)) return null;
  return out;
}

/**
 * Map RIASEC scores to the Skill Mapper's 6 radar axes on an absolute 0–1 scale.
 *
 * Why absolute (not per-user max): the Skill Mapper overlays this profile against
 * an O*NET occupation's radar, and occupation radars are absolute (importance/level
 * normalized to 0–100). If we kept per-user-max normalization the member's chart
 * would *always* peak at 100% on at least one axis regardless of how strong their
 * interests actually are, which makes the gap calculation against an occupation
 * arbitrary.
 *
 * Weighting choices:
 *   - Each axis is a linear combination of at most 2 RIASEC dimensions; weights
 *     sum to 1.0 per axis so a maxed-out user reaches 1.0 on that axis.
 *   - Investigative used to bleed across Analytics + Engineering + Design + Research.
 *     Tightened to Analytics (primary) and Research (primary) so an Investigative
 *     member doesn't get high scores everywhere.
 *   - Social maps to Ethics (legacy axis name in this codebase — covers
 *     people-facing, service, collaboration). Renaming Ethics → "Service" /
 *     "People" is a wider product change tracked separately.
 */
export function riasecToRadarAxes(
  riasec: InterestProfilerRiasec,
  options: { maxPerDimension?: number } = {},
): { axis: SkillMapperRadarAxis; value: number }[] {
  const max = Math.max(1, options.maxPerDimension ?? MINI_IP_MAX_PER_DIMENSION);
  const f = (n: number) => Math.max(0, Math.min(1, n / max));

  const r = f(riasec.realistic);
  const i = f(riasec.investigative);
  const a = f(riasec.artistic);
  const s = f(riasec.social);
  const e = f(riasec.enterprising);
  const c = f(riasec.conventional);

  return [
    { axis: 'Analytics',   value: Math.min(1, i * 0.7  + c * 0.3)  },
    { axis: 'Engineering', value: Math.min(1, r * 0.75 + i * 0.25) },
    { axis: 'Design',      value: Math.min(1, a * 0.85 + i * 0.15) },
    { axis: 'Strategy',    value: Math.min(1, e * 0.7  + c * 0.3)  },
    { axis: 'Ethics',      value: Math.min(1, s * 0.75 + e * 0.25) },
    { axis: 'Research',    value: Math.min(1, i * 0.6  + a * 0.4)  },
  ];
}

