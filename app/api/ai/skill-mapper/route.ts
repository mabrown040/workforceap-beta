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
import { checkAIToolRateLimit, checkAICoachUserRateLimit, checkAICoachIpRateLimit } from '@/lib/rate-limit';
import { captureApiError } from '@/lib/observability/captureApiError';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getFallbackDesignScore } from '@/lib/content/courseSkillMap';
import { getClientIp } from '@/lib/api-utils';
import { createApiErrorResponse, createRateLimitResponse, createServiceUnavailableResponse, createUnauthorizedResponse } from '@/lib/api-utils';
import { withApiGuc } from '@/lib/db/withRequestGuc';

import {
  getDemoRadarForCode,
  isDemoOccupationCode,
  searchDemoOccupations,
} from '@/lib/ai/skillMapperDemo';export const GET = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) return createUnauthorizedResponse();
  
    const { searchParams } = new URL(req.url);
    const occupation = searchParams.get('occupation')?.trim() ?? '';
    const code = searchParams.get('code')?.trim() ?? '';
    const occupationTitle = searchParams.get('title')?.trim() ?? null;
  
    const { success } = await checkAIToolRateLimit(user.id);
    const ip = getClientIp(req);
    const userLimit = await checkAICoachUserRateLimit(user.id);
    const ipLimit = await checkAICoachIpRateLimit(ip);
    if (!userLimit.success || !ipLimit.success) return createRateLimitResponse();
    if (!success) return createRateLimitResponse();
  
    try {
      // If a specific occupation code is provided, return full skill data
      if (code) {
        let skills;
        let radarData;
        let totalSkills;
        let usingDemo = false;
  
        // Look up WorkforceAP programs mapped to this occupation (needed for fallback)
        let matchedPrograms: {
          programSlug: string;
          programTitle: string;
          categoryLabel: string;
          categoryColor: string;
          icon: string;
          duration: string;
          partner: string;
          priority: number;
          experienceBand: string;
          recommendationType: string;
          whyRecommended: string | null;
        }[] = [];
        let fallbackDesignScore: number | undefined;
  
        try {
          const programMappings = await prisma.careerProgramMapping.findMany({
            where: { onetCode: code, isActive: true },
            orderBy: [{ priority: 'asc' }],
            take: 6,
          });
          matchedPrograms = programMappings.map((m) => {
            const p = getProgramBySlug(m.programSlug);
            return {
              programSlug: m.programSlug,
              programTitle: p?.title ?? m.programSlug,
              categoryLabel: p?.categoryLabel ?? '',
              categoryColor: p?.categoryColor ?? '#666',
              icon: p?.icon ?? '',
              duration: p?.duration ?? '',
              partner: p?.partner ?? '',
              priority: m.priority,
              experienceBand: m.experienceBand,
              recommendationType: m.recommendationType,
              whyRecommended: m.whyRecommended,
            };
          });
  
          // Calculate fallback Design score from course mappings
          if (programMappings.length > 0) {
            fallbackDesignScore = getFallbackDesignScore(
              code,
              programMappings.map(m => ({ programSlug: m.programSlug, priority: m.priority }))
            );
          }
        } catch {
          /* non-fatal, programs still render from radar-axis-based recs */
        }
  
        const buildRadarData = (sourceSkills: Awaited<ReturnType<typeof getOccupationSkills>>) =>
          mapSkillsToRadarAxes(sourceSkills, {
            occupationCode: code,
            occupationTitle: occupationTitle ?? undefined,
            fallbackDesignScore,
          });
  
        if (!isOnetConfigured()) {
          if (!isDemoOccupationCode(code)) {
            return createServiceUnavailableResponse(
              'O*NET is not configured. Set ONET_API_KEY to look up this occupation code, or use a demo occupation from search.'
            );
          }
          const demo = getDemoRadarForCode(code);
          skills = demo.skills;
          radarData = demo.radarAxes;
          totalSkills = demo.totalSkills;
          usingDemo = true;
        } else {
          skills = await getOccupationSkills(code);
          radarData = buildRadarData(skills);
          totalSkills = skills.length;
        }
  
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
              demo: usingDemo,
            })
          );
        } catch (saveErr) {
          captureApiError(saveErr, { route: 'ai/skill-mapper save result' });
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
          totalSkills,
          matchedPrograms,
          demo: usingDemo,
          ...(process.env.NODE_ENV === 'development' ? {
            unmatchedAxes: radarData.filter(a => !a.hasData).map(a => a.axis),
            usedFallbackDesign: fallbackDesignScore !== undefined && radarData.find(a => a.axis === 'Design')?.value === fallbackDesignScore,
          } : {}),
        });
      }
  
      // Otherwise search by keyword
      if (occupation) {
        if (occupation.length < 2) {
          return createApiErrorResponse('Enter at least 2 characters to search occupations.', 'VALIDATION_ERROR', 400);
        }
  
        if (isOnetConfigured()) {
          const results = await searchOccupations(occupation);
          if (results.length > 0) return NextResponse.json({ occupations: results });
        }
  
        const demoResults = searchDemoOccupations(occupation);
        if (demoResults.length > 0) {
          return NextResponse.json({ occupations: demoResults, demo: true });
        }
  
        if (!isOnetConfigured()) {
          return NextResponse.json({ occupations: [], demo: true });
        }
  
        return NextResponse.json({ occupations: [] });
      }
  
      return createApiErrorResponse('Provide either ?occupation=keyword or ?code=XX-XXXX.XX', 'VALIDATION_ERROR', 400);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'The skill mapper is temporarily unavailable.';
      captureApiError(err, { route: 'GET /api/ai/skill-mapper', extra: { message } });
      return createApiErrorResponse(message, 'INTERNAL_ERROR', 500);
    }
  } catch (error) {
    console.error('/ai/skill-mapper:', error);
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
});
