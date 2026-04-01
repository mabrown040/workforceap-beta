import { NextRequest, NextResponse } from 'next/server';
import {
  searchOccupations,
  getOccupationSkills,
  mapSkillsToRadarAxes,
} from '@/lib/ai/onetSkills';
import { isOnetConfigured } from '@/lib/onet/client';

/**
 * GET /api/ai/skill-mapper?occupation=software+developer
 *
 * Search O*NET occupations and return skill data for the Skill Mapper radar chart.
 *
 * GET /api/ai/skill-mapper?code=15-1252.00
 *
 * Get skills for a specific O*NET occupation code.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const occupation = searchParams.get('occupation');
  const code = searchParams.get('code');

  if (!isOnetConfigured()) {
    return NextResponse.json(
      { error: 'O*NET is not configured. Set ONET_API_KEY for occupation search and skills.' },
      { status: 503 }
    );
  }

  try {
    // If a specific occupation code is provided, return full skill data
    if (code) {
      const skills = await getOccupationSkills(code);
      const radarData = mapSkillsToRadarAxes(skills);

      return NextResponse.json({
        occupationCode: code,
        skills: skills.slice(0, 20), // Top 20 skills
        radarAxes: radarData,
        totalSkills: skills.length,
      });
    }

    // Otherwise search by keyword
    if (occupation) {
      const results = await searchOccupations(occupation);
      return NextResponse.json({ occupations: results });
    }

    return NextResponse.json(
      { error: 'Provide either ?occupation=keyword or ?code=XX-XXXX.XX' },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[skill-mapper] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
