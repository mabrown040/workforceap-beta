import { RIASEC_AREAS } from '@/lib/career/careerQuizRules';

/**
 * The interest-area for each of O*NET's 30 Interest Profiler Short Form items, in order.
 *
 * O*NET deliberately omits the area from the questions payload (so test-takers aren't
 * biased), which means we can't read it at runtime. But the 30-item Short Form is a fixed,
 * interleaved R-I-A-S-E-C cycle (×5) — verified against the live item text:
 *   1 "Build kitchen cabinets" = Realistic, 2 "Develop a new medicine" = Investigative,
 *   3 "Write books or plays" = Artistic, 4 "Help people…" = Social,
 *   5 "Manage a department" = Enterprising, 6 "Install software…" = Conventional, …repeat.
 * So position i maps to RIASEC_AREAS[i % 6].
 *
 * Hardcoding this (rather than fetching) fixes the scoring: the old fetch returned a null
 * area for every item, so the 6→30 answer synthesis fell back to a neutral "3" everywhere
 * and every taker scored identically (all areas equal → same "Realistic & Investigative"
 * result + an alphabetical career list).
 */
export const MINI_IP_AREA_ORDER: string[] = Array.from(
  { length: 30 },
  (_, i) => RIASEC_AREAS[i % RIASEC_AREAS.length],
);

export async function getMiniIpAreaOrder(): Promise<string[]> {
  return MINI_IP_AREA_ORDER;
}
