import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { checkAIToolRateLimit, checkAICoachUserRateLimit, checkAICoachIpRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/api-utils';
import { createApiErrorResponse, createRateLimitResponse, createServiceUnavailableResponse, createUnauthorizedResponse } from '@/lib/api-utils';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * POST /api/ai/extract-resume-skills
 *
 * Uses AI to extract skills from the member's resume and score them across
 * the 6 radar axes: Analytics, Engineering, Design, Strategy, Ethics, Research.
 *
 * Returns structured JSON with per-axis scores (0–100) and evidence keywords.
 * Much more accurate than the keyword-matching approach in skill-profile.
 */

const RADAR_AXES = ['Analytics', 'Engineering', 'Design', 'Strategy', 'Service', 'Research'] as const;

const SYSTEM_PROMPT = `You are a workforce skills analyst. Given a resume, extract and score the person's competency across exactly 6 skill axes. Return ONLY valid JSON, no markdown fences.

The 6 axes and what they measure:
- Analytics: Data analysis, statistics, SQL, spreadsheets, business intelligence, machine learning, metrics, KPIs, quantitative reasoning, financial modeling
- Engineering: Programming, software development, systems, networking, cloud, hardware, DevOps, automation, IT, cybersecurity, databases
- Design: UX/UI design, graphic design, visual design, prototyping, wireframing, user research, content creation, branding, multimedia
- Strategy: Project management, leadership, planning, agile/scrum, stakeholder management, business development, operations, budgeting, negotiation, sales, account management, pipeline management, quota attainment, CRM, territory management, revenue growth, account executive
- Ethics: Compliance, HIPAA, privacy, customer service, communication, teamwork, mentoring, diversity, empathy, professionalism, safety, patient care, ethics coursework
- Research: Academic research, technical writing, documentation, continuous learning, certifications, data collection, analysis methodology, thesis, dissertation

IMPORTANT — extrapolate from degrees, titles, and coursework. Do not be overly conservative:
- MBA or Master's in Business: Analytics ≥65, Strategy ≥75, Research ≥65, Ethics ≥60 (MBA programs require stats, finance, strategy, ethics, and research methods courses)
- Any Bachelor's degree: Research ≥50 (academic writing, methodology, coursework)
- PhD or Master's in any field: Research ≥75, Analytics ≥60
- Job titles like Director, VP, C-suite, Senior Manager: Strategy ≥70 minimum
- 5+ years of continuous work experience in a domain: treat that axis as at least 60
- Mentions of college courses (Ethics, Statistics, Marketing, Finance, etc.) count as direct evidence for that axis
- Healthcare roles (nurse, CNA, medical assistant, patient care): Ethics ≥65 minimum
- Teaching or training roles: Research ≥55, Ethics ≥60 minimum

Score each axis 0-100. 0 = no evidence. 30-50 = some indirect signals. 60-80 = solid demonstrated experience. 80-100 = expert/extensive evidence.

For each axis, list 2-5 specific keywords/phrases from the resume that justify the score (include degree or job title if that's the evidence).

Output format (JSON only):
{
  "axes": [
    {"axis": "Analytics", "score": 65, "evidence": ["SQL", "data analysis", "Tableau"]},
    {"axis": "Engineering", "score": 80, "evidence": ["Python", "AWS", "React", "CI/CD"]},
    ...all 6 axes...
  ],
  "topSkills": ["Python", "Project Management", "Data Analysis", "AWS", "Team Leadership"],
  "suggestedOccupations": ["Software Developer", "Data Analyst"]
}`;export const POST = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return createUnauthorizedResponse();
    if (!isAIConfigured()) return createServiceUnavailableResponse();
  
    const { success } = await checkAIToolRateLimit(user.id);
    const ip = getClientIp(request);
    const userLimit = await checkAICoachUserRateLimit(user.id);
    const ipLimit = await checkAICoachIpRateLimit(ip);
    if (!userLimit.success || !ipLimit.success) return createRateLimitResponse();
    if (!success) return createRateLimitResponse();
  
  
    try {
      // Get resume text
      const resumeText = await getMemberResumePlainText(user.id, 6000);
      if (!resumeText || resumeText.length < 50) {
        return createApiErrorResponse(
          'No resume found. Upload a resume first to extract skills.',
          'VALIDATION_ERROR',
          400,
        );
      }
  
      const output = await chatCompletion(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Resume:\n---\n${resumeText}\n---\n\nExtract skills and score each axis. Return JSON only.` },
        ],
        { maxTokens: 800, temperature: 0.3 },
      );
  
      if (!output) {
        return createApiErrorResponse('AI extraction failed', 'INTERNAL_ERROR', 500);
      }
  
      // Parse the JSON response — handle potential markdown fences
      const cleaned = output.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      let parsed: {
        axes?: { axis: string; score: number; evidence: string[] }[];
        topSkills?: string[];
        suggestedOccupations?: string[];
      };
  
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Try to extract JSON from a potentially chatty response
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          return createApiErrorResponse('We could not read the AI response just now. Please try again in a moment.', 'INTERNAL_ERROR', 500);
        }
      }
  
      // Validate and normalize
      const axes = RADAR_AXES.map((axis) => {
        const found = parsed.axes?.find((a) => a.axis === axis);
        return {
          axis,
          score: Math.min(100, Math.max(0, Math.round(found?.score ?? 0))),
          evidence: (found?.evidence ?? []).slice(0, 5),
        };
      });
  
      // Save to DB so skill-profile can pick it up on next load
      try {
        await ensureUserInDb(user);
        await saveAIToolResult(
          user.id,
          'skill_assessment',
          'AI resume skill extraction',
          JSON.stringify({
            source: 'ai_resume_extraction',
            axes,
            topSkills: (parsed.topSkills ?? []).slice(0, 8),
            suggestedOccupations: (parsed.suggestedOccupations ?? []).slice(0, 3),
          }),
        );
      } catch {
        /* non-fatal — result still returned to client */
      }
  
      return NextResponse.json({
        axes,
        topSkills: (parsed.topSkills ?? []).slice(0, 8),
        suggestedOccupations: (parsed.suggestedOccupations ?? []).slice(0, 3),
        source: 'ai',
      });
    } catch (error) {
      console.error('[ai/extract-resume-skills] error:', error);
      return createApiErrorResponse('Skill extraction failed', 'INTERNAL_ERROR', 500);
    }
  } catch (error) {
    console.error('/ai/extract-resume-skills:', error);
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
});
