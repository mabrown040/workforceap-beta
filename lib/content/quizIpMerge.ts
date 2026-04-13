/**
 * Blend O*NET Interest Profiler (RIASEC) scores into Find Your Path category weights.
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

export type StoredInterestProfilerV1 = {
  version: 1;
  answers: string;
  riasec: InterestProfilerRiasec;
  completedAt: string;
};

/** Normalize RIASEC 0–40+ scales to 0–1 for blending. */
function norm(r: InterestProfilerRiasec): Record<keyof InterestProfilerRiasec, number> {
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
 */
export function mergeRiasecIntoWeights(base: CategoryWeights, riasec: InterestProfilerRiasec): CategoryWeights {
  const n = norm(riasec);
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
