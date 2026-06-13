import { fetchAllMiniIpQuestions } from '@/lib/onet/interestProfiler';

/**
 * The interest-area title for each of O*NET's 30 Mini-IP items, in order.
 * Cached process-wide — the item set is static, so we avoid re-fetching it on
 * every career-quiz submission.
 */
let cachedAreas: (string | undefined)[] | null = null;

export async function getMiniIpAreaOrder(): Promise<(string | undefined)[]> {
  if (cachedAreas && cachedAreas.length === 30) return cachedAreas;
  const questions = await fetchAllMiniIpQuestions();
  const areas = questions.map((q) => q.area);
  if (areas.length === 30) cachedAreas = areas;
  return areas;
}
