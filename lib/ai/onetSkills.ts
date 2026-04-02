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
  // O*NET can return either normalized percentages (0–100) or raw scales (importance 1–5, level 0–7).
  if (importance != null && importance > 0) {
    if (importance > 5) return Math.min(100, Math.round(importance));
    return Math.min(100, Math.round((importance / 5) * 100));
  }
  if (level != null && level > 0) {
    if (level > 7) return Math.min(100, Math.round(level));
    return Math.min(100, Math.round((level / 7) * 100));
  }
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
  const overallAverage = skills.length
    ? Math.round(skills.reduce((sum, s) => sum + s.score, 0) / skills.length)
    : 0;

  const axes = [
    {
      axis: 'Analytics',
      keywords: ['mathematics', 'math', 'data', 'statistics', 'analysis', 'analytical', 'critical thinking', 'problem solving'],
    },
    {
      axis: 'Engineering',
      keywords: ['programming', 'systems', 'technology', 'engineering', 'operations monitoring', 'equipment', 'computers', 'installation'],
    },
    {
      axis: 'Design',
      keywords: ['design', 'creative', 'visualization', 'user', 'interface', 'fine arts', 'drafting', 'layout'],
    },
    {
      axis: 'Strategy',
      keywords: ['management', 'planning', 'coordination', 'leadership', 'decision', 'monitoring', 'judgment', 'operations analysis'],
    },
    {
      axis: 'Ethics',
      keywords: ['social', 'service', 'compliance', 'regulation', 'governance', 'integrity', 'dependability', 'concern for others'],
    },
    {
      axis: 'Research',
      keywords: ['research', 'writing', 'reading', 'learning', 'science', 'active learning', 'investigation', 'studying'],
    },
  ];

  return axes.map(({ axis, keywords }) => {
    const matching = skills.filter((s) => keywords.some((kw) => s.name.toLowerCase().includes(kw)));
    const fallback = matching.length === 0 ? skills.slice(0, 3) : matching;
    const avgScore = fallback.length > 0
      ? Math.round(fallback.reduce((sum, s) => sum + s.score, 0) / fallback.length)
      : overallAverage;
    // Keep every axis populated even when keyword matching is sparse for a role.
    const value = avgScore > 0 ? avgScore : overallAverage;
    return { axis, value, maxValue: 100 };
  });
}
