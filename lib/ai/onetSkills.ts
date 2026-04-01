/**
 * O*NET Skills Data Utility for Skill Mapper.
 *
 * Delegates to {@link '@/lib/onet/client'} — correct O*NET Web Services API v2 paths
 * (`online/search`, `online/occupations/.../summary/skills`) and `X-API-Key` via `ONET_API_KEY`.
 *
 * @see https://services.onetcenter.org/reference/start/overview
 */

import {
  searchOccupations as onetSearchOccupations,
  getOccupationSkills as onetFetchOccupationSkills,
} from '@/lib/onet/client';

export interface OnetSkill {
  id: string;
  name: string;
  score: number;
  category: 'skill' | 'knowledge' | 'ability' | 'technology';
}

export interface OnetOccupation {
  code: string;
  title: string;
  description: string;
}

export async function searchOccupations(keyword: string): Promise<OnetOccupation[]> {
  const rows = await onetSearchOccupations(keyword);
  return rows.map((o) => ({
    code: o.code,
    title: o.title,
    description: '',
  }));
}

function scoreFromRatings(importance: number | null, level: number | null): number {
  if (importance != null && importance > 0) return Math.min(100, Math.round(importance));
  if (level != null && level > 0) return Math.min(100, Math.round((level / 7) * 100));
  return 0;
}

export async function getOccupationSkills(occupationCode: string): Promise<OnetSkill[]> {
  const rows = await onetFetchOccupationSkills(occupationCode);
  return rows
    .map((r, i) => ({
      id: `s-${i}`,
      name: r.name,
      score: scoreFromRatings(r.importance, r.level),
      category: 'skill' as const,
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Curated skill categories for radar chart visualization.
 * Maps O*NET skill names to the 6 radar axes used in the Skill Mapper design.
 */
export function mapSkillsToRadarAxes(
  skills: OnetSkill[]
): { axis: string; value: number; maxValue: number }[] {
  const axes = [
    { axis: 'Analytics', keywords: ['mathematics', 'data', 'statistics', 'analysis', 'critical thinking'] },
    { axis: 'Engineering', keywords: ['programming', 'systems', 'technology', 'engineering', 'design'] },
    { axis: 'Design', keywords: ['design', 'creative', 'visualization', 'user', 'interface'] },
    { axis: 'Strategy', keywords: ['management', 'planning', 'coordination', 'leadership', 'decision'] },
    { axis: 'Ethics', keywords: ['social', 'service', 'compliance', 'regulation', 'governance'] },
    { axis: 'Research', keywords: ['research', 'writing', 'reading', 'learning', 'science'] },
  ];

  return axes.map(({ axis, keywords }) => {
    const matching = skills.filter((s) =>
      keywords.some((kw) => s.name.toLowerCase().includes(kw))
    );
    const avgScore =
      matching.length > 0
        ? Math.round(matching.reduce((sum, s) => sum + s.score, 0) / matching.length)
        : 0;
    return { axis, value: avgScore, maxValue: 100 };
  });
}
