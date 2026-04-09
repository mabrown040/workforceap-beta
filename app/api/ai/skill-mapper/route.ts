import { NextRequest, NextResponse } from 'next/server';
import {
  searchOccupations,
  getOccupationSkills,
  mapSkillsToRadarAxes,
} from '@/lib/ai/onetSkills';
import { isOnetConfigured } from '@/lib/onet/client';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { trackEvent } from '@/lib/events/track';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { captureApiError } from '@/lib/observability/captureApiError';

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
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const occupation = searchParams.get('occupation')?.trim() ?? '';
  const code = searchParams.get('code')?.trim() ?? '';
  const occupationTitle = searchParams.get('title')?.trim() ?? null;

  const { success } = await checkAIToolRateLimit(user.id);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

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

      try {
        await ensureUserInDb(user);
        await saveAIToolResult(
          user.id,
          'skill_assessment',
          `Skill mapper lookup (${code})`,
          JSON.stringify({
            occupationTitle: occupationTitle ?? code,
            occupationCode: code,
            radarAxes: radarData,
            skills: skills.slice(0, 20),
            gaps: [], // populated by client from profile comparison
          })
        );
      } catch (saveErr) {
        console.error('Skill mapper: failed to save result', saveErr);
      }

      await trackEvent({
        userId: user.id,
        eventName: 'ai_tool_run_completed',
        entityType: 'ai_tool',
        metadata: { tool: 'skill_assessment', mode: 'occupation_lookup', occupationCode: code },
        sourcePage: '/dashboard/skills-assessment',
      });

      return NextResponse.json({
        occupationTitle: occupationTitle ?? code,
        occupationCode: code,
        skills: skills.slice(0, 20), // Top 20 skills
        radarAxes: radarData,
        totalSkills: skills.length,
        ...(process.env.NODE_ENV === 'development' ? {
          unmatchedAxes: radarData.filter(a => !a.hasData).map(a => a.axis),
        } : {}),
      });
    }

    // Otherwise search by keyword
    if (occupation) {
      if (occupation.length < 2) {
        return NextResponse.json(
          { error: 'Enter at least 2 characters to search occupations.' },
          { status: 400 }
        );
      }
      const results = await searchOccupations(occupation);
      await trackEvent({
        userId: user.id,
        eventName: 'ai_tool_run_started',
        entityType: 'ai_tool',
        metadata: { tool: 'skill_assessment', mode: 'occupation_search', query: occupation },
        sourcePage: '/dashboard/skills-assessment',
      });
      return NextResponse.json({ occupations: results });
    }

    return NextResponse.json(
      { error: 'Provide either ?occupation=keyword or ?code=XX-XXXX.XX' },
      { status: 400 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'The skill mapper is temporarily unavailable.';
    captureApiError(err, { route: 'GET /api/ai/skill-mapper', extra: { message } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
