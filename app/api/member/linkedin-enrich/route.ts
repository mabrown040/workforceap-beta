import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/member/linkedin-enrich
 * Body: { linkedinUrl: string }
 *
 * Enriches the member's skill profile from their LinkedIn public URL.
 *
 * IMPLEMENTATION OPTIONS (in order of reliability):
 * 1. Proxycurl API (PROXYCURL_API_KEY env var) — structured JSON, $0.01/call
 * 2. Native fetch of public profile — LinkedIn blocks most headless fetches
 *    with 999 errors; works ~20% of the time, not reliable for production.
 *
 * When PROXYCURL_API_KEY is set, uses Proxycurl.
 * Otherwise returns { note: 'manual_only' } and skips enrichment.
 *
 * The returned skills feed into /api/member/skill-profile the next time
 * it's called — stored as a skill_assessment AIToolResult with
 * source: 'linkedin_enrichment'.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { linkedinUrl?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const linkedinUrl = body.linkedinUrl?.trim();
  if (!linkedinUrl || !linkedinUrl.includes('linkedin.com')) {
    return NextResponse.json({ error: 'Provide a valid LinkedIn profile URL' }, { status: 400 });
  }

  // Save URL to profile regardless
  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, profileLinkedin: linkedinUrl },
    update: { profileLinkedin: linkedinUrl },
  });

  // Proxycurl path — set PROXYCURL_API_KEY in Vercel secrets
  const proxycurlKey = process.env.PROXYCURL_API_KEY;
  if (proxycurlKey) {
    try {
      const res = await fetch(
        `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}&skills=include&education=include`,
        { headers: { Authorization: `Bearer ${proxycurlKey}` }, next: { revalidate: 0 } }
      );
      if (!res.ok) throw new Error(`Proxycurl ${res.status}`);

      const profile = await res.json() as {
        skills?: Array<{ name: string }>;
        headline?: string;
        experiences?: Array<{ title: string; company: string; description?: string }>;
        education?: Array<{ degree_name?: string; field_of_study?: string }>;
        certifications?: Array<{ name: string }>;
      };

      // Extract skill text for our keyword extraction engine
      const skillText = [
        ...(profile.skills ?? []).map(s => s.name),
        profile.headline ?? '',
        ...(profile.experiences ?? []).map(e => `${e.title} ${e.company} ${e.description ?? ''}`),
        ...(profile.education ?? []).map(e => `${e.degree_name ?? ''} ${e.field_of_study ?? ''}`),
        ...(profile.certifications ?? []).map(c => c.name),
      ].join(' ');

      // Save as a skill_assessment result so /api/member/skill-profile picks it up
      await prisma.aIToolResult.create({
        data: {
          userId: user.id,
          toolType: 'skill_assessment',
          inputSummary: `LinkedIn enrichment: ${linkedinUrl}`,
          output: JSON.stringify({
            source: 'linkedin_enrichment',
            linkedinUrl,
            skillText,
            skills: profile.skills ?? [],
            headline: profile.headline,
            extractedAt: new Date().toISOString(),
          }),
        },
      });

      return NextResponse.json({
        success: true,
        source: 'proxycurl',
        skillCount: profile.skills?.length ?? 0,
        message: 'LinkedIn skills saved. Your Skill Mapper profile will update on next view.',
      });
    } catch (e) {
      console.error('[linkedin-enrich] Proxycurl failed', e);
      return NextResponse.json({ error: 'Enrichment failed — check Proxycurl API key', source: 'proxycurl' }, { status: 502 });
    }
  }

  // No Proxycurl key — LinkedIn URL saved, enrichment skipped
  return NextResponse.json({
    success: true,
    source: 'manual_only',
    note: 'LinkedIn URL saved to your profile. To enable automatic skill extraction, add PROXYCURL_API_KEY to environment secrets.',
  });
}
