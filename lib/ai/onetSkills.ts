/**
 * O*NET Skills Data Utility for Skill Mapper.
 *
 * Uses the O*NET Web Services API (US Dept of Labor) to fetch
 * occupation skills, knowledge areas, and abilities.
 *
 * O*NET data is public domain. API registration is free:
 * https://services.onetcenter.org/
 *
 * For basic lookups, we can use the O*NET OnLine public data
 * without API credentials (HTML scraping fallback).
 */

const ONET_API_URL = 'https://services.onetcenter.org/ws';

interface OnetSkill {
  id: string;
  name: string;
  score: number; // 0-100 importance/level
  category: 'skill' | 'knowledge' | 'ability' | 'technology';
}

interface OnetOccupation {
  code: string;
  title: string;
  description: string;
}

/**
 * Search O*NET occupations by keyword.
 */
export async function searchOccupations(
  keyword: string
): Promise<OnetOccupation[]> {
  const auth = getAuthHeader();
  const url = `${ONET_API_URL}/online/search?keyword=${encodeURIComponent(keyword)}&start=1&end=10`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(auth ? { Authorization: auth } : {}),
    },
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.occupation ?? []).map(
    (o: { code: string; title: string; description?: string }) => ({
      code: o.code,
      title: o.title,
      description: o.description ?? '',
    })
  );
}

/**
 * Get skills required for a specific O*NET occupation code.
 * Returns skills sorted by importance score.
 */
export async function getOccupationSkills(
  occupationCode: string
): Promise<OnetSkill[]> {
  const auth = getAuthHeader();
  const results: OnetSkill[] = [];

  // Fetch skills
  const skillsData = await fetchOnetResource(
    `${ONET_API_URL}/online/occupations/${occupationCode}/summary/skills`,
    auth
  );
  if (skillsData?.element) {
    for (const el of skillsData.element) {
      results.push({
        id: el.id,
        name: el.name,
        score: Math.round((el.score?.value ?? 0) * 20), // normalize 0-5 to 0-100
        category: 'skill',
      });
    }
  }

  // Fetch knowledge areas
  const knowledgeData = await fetchOnetResource(
    `${ONET_API_URL}/online/occupations/${occupationCode}/summary/knowledge`,
    auth
  );
  if (knowledgeData?.element) {
    for (const el of knowledgeData.element) {
      results.push({
        id: el.id,
        name: el.name,
        score: Math.round((el.score?.value ?? 0) * 20),
        category: 'knowledge',
      });
    }
  }

  // Fetch technology skills
  const techData = await fetchOnetResource(
    `${ONET_API_URL}/online/occupations/${occupationCode}/summary/technology_skills`,
    auth
  );
  if (techData?.element) {
    for (const el of techData.element) {
      results.push({
        id: el.id ?? el.name,
        name: el.name,
        score: 50, // tech skills don't have importance scores
        category: 'technology',
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Get a curated set of skill categories for radar chart visualization.
 * Maps O*NET skill groups to the 6 radar axes used in the stitch Skill Mapper design.
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

// --- Helpers ---

function getAuthHeader(): string | null {
  const username = process.env.ONET_API_USERNAME;
  const password = process.env.ONET_API_PASSWORD;
  if (!username || !password) return null;
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

async function fetchOnetResource(
  url: string,
  auth: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
