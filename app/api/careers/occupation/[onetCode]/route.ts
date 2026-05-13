import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { translateOccupationDescription, translateSkillName, translateTaskLine } from '@/lib/onet/copy';
import { ONET_CODE_PATTERN, resolveOccupationTitle } from '@/lib/onet/occupationTitles';
import { checkPublicCareersGetRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';

type Params = { params: Promise<{ onetCode: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ip = getClientIpFromRequest(request);
    const { success: withinLimit } = await checkPublicCareersGetRateLimit(ip);
    if (!withinLimit) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
  
    try {
      const { onetCode: raw } = await params;
      const onetCode = decodeURIComponent(raw || '').trim();
      if (!onetCode) {
        return NextResponse.json({ error: 'Missing occupation code' }, { status: 400 });
      }
  
      const occ = await prisma.onetOccupation.findUnique({
        where: { onetCode },
        include: {
          skills: { take: 12, orderBy: { importance: 'desc' } },
          tasks: { take: 8 },
          relatedFrom: { take: 8 },
          programMappings: {
            where: { isActive: true },
            orderBy: [{ experienceBand: 'asc' }, { priority: 'asc' }],
          },
        },
      });
  
      if (!occ) {
        return NextResponse.json({ error: 'Occupation not found' }, { status: 404 });
      }
  
      const mappedPrograms = occ.programMappings.map((m) => {
        const p = getProgramBySlug(m.programSlug);
        return {
          programSlug: m.programSlug,
          programTitle: p?.title ?? m.programSlug,
          priority: m.priority,
          experienceBand: m.experienceBand,
          recommendationType: m.recommendationType,
          whyRecommended: m.whyRecommended,
        };
      });
  
      // If the DB title is missing or just the raw SOC code, fall back to the
      // hand-curated title map so we never return raw codes to the UI.
      const friendlyTitle =
        !occ.title || ONET_CODE_PATTERN.test(occ.title)
          ? resolveOccupationTitle(occ.onetCode, occ.title) ?? occ.title
          : occ.title;
  
      return NextResponse.json({
        onetCode: occ.onetCode,
        title: friendlyTitle,
        description: translateOccupationDescription(occ.description, friendlyTitle),
        jobFamily: occ.jobFamily,
        brightOutlook: occ.brightOutlook,
        educationLevel: occ.educationLevel,
        outlookSummary: occ.outlookSummary,
        salaryLow: occ.salaryLow,
        salaryMedian: occ.salaryMedian,
        salaryHigh: occ.salaryHigh,
        skills: occ.skills.map((s) => ({
          name: translateSkillName(s.skillName),
          importance: s.importance,
          level: s.level,
        })),
        tasks: occ.tasks.map((t) => translateTaskLine(t.taskText)),
        relatedOccupations: await Promise.all(
          occ.relatedFrom.map(async (r) => {
            const rel = await prisma.onetOccupation.findUnique({
              where: { onetCode: r.relatedOnetCode },
              select: { onetCode: true, title: true },
            });
            return {
              onetCode: r.relatedOnetCode,
              title: rel?.title ?? r.relatedOnetCode,
              relationshipType: r.relationshipType,
            };
          })
        ),
        mappedPrograms,
      });
    } catch (error) {
      console.error('[careers/occupation/[onetCode]] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  } catch (error) {
    console.error('/careers/occupation/[onetCode]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
