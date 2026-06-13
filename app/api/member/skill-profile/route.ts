import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { mapSkillsToRadarAxes } from '@/lib/ai/onetSkills';
import type { OnetSkill } from '@/lib/ai/onetSkills';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';
import { riasecToRadarAxes } from '@/lib/content/quizIpMerge';

import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * GET /api/member/skill-profile
 *
 * Returns the member's skill profile as radar axes, sourced from:
 *   1. Certifications → mapped to skill axes via cert-to-skill mapping
 *   2. Resume plain text → simple NLP keyword extraction to axes
 *   3. O*NET Interest Profiler / self-assessment answers (if present)
 *
 * Response:
 *   { skillProfile: [{axis, value}], certNames: string[], resumeSkills: [{axis, value}] }
 */

// Keyword → broad skill score mapping for resume text extraction.
// Each entry: [keyword, axis, score]. Scanned against lowercased resume text.
const RESUME_SKILL_HINTS: Array<[string, string, number]> = [
  // Analytics
  ['data analysis', 'Analytics', 80], ['analytics', 'Analytics', 75],
  ['statistics', 'Analytics', 70], ['excel', 'Analytics', 60],
  ['sql', 'Analytics', 75], ['tableau', 'Analytics', 70],
  ['python', 'Analytics', 70], ['machine learning', 'Analytics', 85],
  ['business intelligence', 'Analytics', 75], ['reporting', 'Analytics', 65],
  ['metrics', 'Analytics', 60], ['kpi', 'Analytics', 65],
  ['forecasting', 'Analytics', 68], ['revenue', 'Analytics', 62],
  ['pipeline analysis', 'Analytics', 68],
  // Engineering / Technical
  ['programming', 'Engineering', 80], ['software', 'Engineering', 75],
  ['javascript', 'Engineering', 80], ['typescript', 'Engineering', 80],
  ['react', 'Engineering', 75], ['node', 'Engineering', 75],
  ['java', 'Engineering', 75], ['c++', 'Engineering', 75],
  ['aws', 'Engineering', 75], ['cloud', 'Engineering', 70],
  ['devops', 'Engineering', 80], ['linux', 'Engineering', 70],
  ['database', 'Engineering', 70], ['api', 'Engineering', 70],
  ['automation', 'Engineering', 70], ['networking', 'Engineering', 70],
  ['it support', 'Engineering', 65], ['helpdesk', 'Engineering', 60],
  ['cybersecurity', 'Engineering', 80], ['salesforce', 'Engineering', 65],
  // Design
  ['design', 'Design', 75], ['ux', 'Design', 80], ['ui', 'Design', 75],
  ['figma', 'Design', 80], ['photoshop', 'Design', 70],
  ['graphic', 'Design', 70], ['prototyping', 'Design', 75],
  ['user research', 'Design', 75], ['wireframe', 'Design', 70],
  ['branding', 'Design', 65], ['content creation', 'Design', 60],
  // Strategy — general
  ['project management', 'Strategy', 80], ['pmp', 'Strategy', 85],
  ['strategy', 'Strategy', 75], ['leadership', 'Strategy', 75],
  ['management', 'Strategy', 70], ['planning', 'Strategy', 70],
  ['operations', 'Strategy', 70], ['budget', 'Strategy', 65],
  ['stakeholder', 'Strategy', 70], ['cross-functional', 'Strategy', 70],
  ['agile', 'Strategy', 75], ['scrum', 'Strategy', 75],
  ['product management', 'Strategy', 80], ['business development', 'Strategy', 70],
  ['negotiation', 'Strategy', 65], ['negotiating', 'Strategy', 65],
  // Strategy — sales/AE-specific (account executives and sales roles produce these terms)
  ['sales', 'Strategy', 65], ['account management', 'Strategy', 68],
  ['quota', 'Strategy', 60], ['quota attainment', 'Strategy', 72],
  ['account executive', 'Strategy', 75], ['sales representative', 'Strategy', 70],
  ['sales manager', 'Strategy', 75], ['business development representative', 'Strategy', 70],
  ['pipeline', 'Strategy', 70], ['prospecting', 'Strategy', 70],
  ['territory', 'Strategy', 68], ['territory management', 'Strategy', 72],
  ['closing', 'Strategy', 68], ['crm', 'Strategy', 68],
  ['hubspot', 'Strategy', 68], ['salesforce', 'Strategy', 65],
  ['contract', 'Strategy', 65], ['revenue growth', 'Strategy', 72],
  ['b2b', 'Strategy', 68], ['saas', 'Strategy', 65],
  ['forecasting', 'Strategy', 70],
  // Service / People
  ['compliance', 'Service', 70], ['hipaa', 'Service', 75],
  ['gdpr', 'Service', 75], ['privacy', 'Service', 70],
  ['diversity', 'Service', 65], ['inclusion', 'Service', 65],
  ['customer service', 'Service', 65], ['communication', 'Service', 65],
  ['mentoring', 'Service', 65], ['coaching', 'Service', 65],
  ['collaboration', 'Service', 60], ['teamwork', 'Service', 60],
  ['interpersonal', 'Service', 65], ['empathy', 'Service', 65],
  // Service — sales/client-facing (AE roles have strong relationship/communication signals)
  ['client relationship', 'Service', 72], ['client management', 'Service', 68],
  ['relationship building', 'Service', 70], ['outreach', 'Service', 68],
  ['cold call', 'Service', 65], ['discovery call', 'Service', 65],
  ['presentations', 'Service', 68],
  // Research
  ['research', 'Research', 75], ['writing', 'Research', 70],
  ['technical writing', 'Research', 80], ['documentation', 'Research', 70],
  ['content', 'Research', 65], ['certification', 'Research', 65],
  ['training', 'Research', 60], ['learning', 'Research', 60],
  ['curriculum', 'Research', 65], ['analysis', 'Research', 65],
  // Degrees → axis boosts (extrapolate coursework from credential)
  ['mba', 'Strategy', 75], ['mba', 'Analytics', 65], ['mba', 'Research', 70], ['mba', 'Service', 60],
  ['master', 'Research', 70], ['bachelor', 'Research', 55],
  ['phd', 'Research', 85], ['phd', 'Analytics', 70],
  ['degree', 'Research', 58],
  // Senior titles → Strategy floor
  ['director', 'Strategy', 78], ['vice president', 'Strategy', 82],
  [' vp ', 'Strategy', 80], ['chief ', 'Strategy', 85],
  ['executive director', 'Strategy', 82],
  // Service-adjacent coursework
  ['ethics', 'Service', 68], ['corporate responsibility', 'Service', 65],
  // Healthcare / clinical
  ['patient care', 'Service', 70], ['clinical', 'Research', 65],
  ['nursing', 'Service', 70], ['cna', 'Service', 68],
  ['medical assistant', 'Service', 65], ['phlebotomy', 'Engineering', 60],
  ['ehr', 'Engineering', 65], ['emr', 'Engineering', 65],
  ['electronic health', 'Engineering', 65], ['epic', 'Engineering', 65],
  ['hipaa', 'Service', 75], ['patient', 'Service', 60],
  ['vital signs', 'Research', 62], ['medical coding', 'Research', 70],
  ['icd-10', 'Research', 72], ['billing', 'Strategy', 60],
  ['insurance verification', 'Strategy', 62], ['prior authorization', 'Research', 65],
  ['pharmacy', 'Research', 65], ['medication', 'Research', 60],
  ['home health', 'Service', 65], ['long-term care', 'Service', 65],
  ['diagnostic', 'Research', 68], ['laboratory', 'Research', 70],
  ['radiology', 'Engineering', 65], ['clinical trial', 'Research', 72],
  ['health informatics', 'Analytics', 70],
  // Customer service / retail / administrative
  ['customer satisfaction', 'Service', 68], ['call center', 'Service', 65],
  ['customer support', 'Service', 68], ['help desk', 'Engineering', 60],
  ['ticketing', 'Engineering', 60], ['escalation', 'Service', 60],
  ['retail', 'Service', 58], ['cashier', 'Service', 55],
  ['point of sale', 'Engineering', 58], ['inventory', 'Strategy', 60],
  ['merchandising', 'Strategy', 58], ['loss prevention', 'Service', 60],
  ['administrative', 'Strategy', 62], ['office management', 'Strategy', 65],
  ['scheduling', 'Strategy', 62], ['calendar management', 'Strategy', 60],
  ['bookkeeping', 'Analytics', 65], ['accounts payable', 'Analytics', 62],
  ['accounts receivable', 'Analytics', 62], ['payroll', 'Analytics', 65],
  ['quickbooks', 'Analytics', 65], ['data entry', 'Research', 55],
  // Education / social services / non-profit
  ['teaching', 'Research', 65], ['educator', 'Research', 65],
  ['lesson plan', 'Research', 65], ['early childhood', 'Service', 65],
  ['childcare', 'Service', 62], ['social work', 'Service', 72],
  ['case management', 'Service', 70], ['counseling', 'Service', 70],
  ['community outreach', 'Service', 65], ['grant writing', 'Research', 70],
  ['volunteer', 'Service', 55], ['non-profit', 'Service', 60],
];

const RADAR_AXES = ['Analytics', 'Engineering', 'Design', 'Strategy', 'Service', 'Research'];

type ResumeProfileResult = {
  profile: { axis: string; value: number }[];
  matched: Record<string, string[]>; // axis → matched keywords for transparency
};

function extractResumeSkillProfile(resumeText: string): ResumeProfileResult {
  const lower = resumeText.toLowerCase();
  const axisScores: Record<string, number[]> = {};
  const axisMatched: Record<string, string[]> = {};
  RADAR_AXES.forEach((a) => { axisScores[a] = []; axisMatched[a] = []; });

  for (const [keyword, axis, score] of RESUME_SKILL_HINTS) {
    if (lower.includes(keyword)) {
      axisScores[axis].push(score);
      axisMatched[axis].push(keyword);
    }
  }

  return {
    profile: RADAR_AXES.map((axis) => {
      const scores = axisScores[axis];
      if (scores.length === 0) return { axis, value: 0 };
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      return { axis, value: avg / 100 };
    }),
    matched: axisMatched,
  };
}

// Cert name → skill score boosts per axis
const CERT_AXIS_MAP: Record<string, Partial<Record<string, number>>> = {
  // IT / Tech
  'CompTIA A+': { Engineering: 75 },
  'CompTIA Security+': { Engineering: 80, Ethics: 70 },
  'CompTIA Network+': { Engineering: 75 },
  'Google IT Support': { Engineering: 70 },
  'IBM AI Professional Practitioner': { Analytics: 80, Engineering: 75 },
  'Google Data Analytics': { Analytics: 85, Research: 70 },
  'Google Project Management': { Strategy: 80 },
  'Salesforce Administrator': { Engineering: 65, Strategy: 65 },
  'AWS Cloud Practitioner': { Engineering: 75 },
  'Microsoft Azure Fundamentals': { Engineering: 70 },
  'Microsoft Office': { Analytics: 55, Strategy: 55 },
  'Google Workspace': { Strategy: 58, Research: 55 },
  // Healthcare
  'Healthcare Administration': { Ethics: 75, Strategy: 70 },
  'Medical Coding': { Research: 70, Ethics: 70 },
  'CNA': { Ethics: 75 },
  'Certified Nursing Assistant': { Ethics: 75 },
  'Medical Assistant': { Ethics: 70, Research: 62 },
  'Phlebotomy': { Engineering: 62, Research: 65 },
  'BLS': { Ethics: 65 },
  'Basic Life Support': { Ethics: 65 },
  'CPR': { Ethics: 62 },
  'OSHA 10': { Ethics: 68 },
  'OSHA 30': { Ethics: 72, Strategy: 60 },
  'Health Information': { Research: 72, Engineering: 65 },
  'Medical Billing': { Research: 68, Analytics: 60 },
  'Pharmacy Technician': { Research: 70, Ethics: 65 },
  // Business / Finance / Admin
  'QuickBooks': { Analytics: 68 },
  'Bookkeeping': { Analytics: 65 },
  'Human Resources': { Ethics: 70, Strategy: 65 },
  'SHRM': { Ethics: 72, Strategy: 68 },
  'Lean Six Sigma': { Strategy: 78, Analytics: 70 },
  'PMP': { Strategy: 85 },
  // Customer service
  'Customer Service': { Ethics: 68 },
  'HDI': { Ethics: 65, Engineering: 60 },
};

function buildCertSkillProfile(certNames: string[]): { axis: string; value: number }[] {
  const axisScores: Record<string, number[]> = {};
  RADAR_AXES.forEach((a) => { axisScores[a] = []; });

  for (const cert of certNames) {
    const entry = Object.entries(CERT_AXIS_MAP).find(([key]) =>
      cert.toLowerCase().includes(key.toLowerCase())
    );
    if (entry) {
      const boosts = entry[1];
      for (const [axis, score] of Object.entries(boosts)) {
        if (score) axisScores[axis].push(score);
      }
    }
  }

  return RADAR_AXES.map((axis) => {
    const scores = axisScores[axis];
    if (scores.length === 0) return { axis, value: 0 };
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return { axis, value: avg / 100 };
  });
}

function mergeProfiles(
  certProfile: { axis: string; value: number }[],
  resumeProfile: { axis: string; value: number }[],
): { axis: string; value: number }[] {
  return RADAR_AXES.map((axis) => {
    const certVal = certProfile.find((p) => p.axis === axis)?.value ?? 0;
    const resumeVal = resumeProfile.find((p) => p.axis === axis)?.value ?? 0;
    // Take the higher of cert or resume signal
    return { axis, value: Math.min(1, Math.max(certVal, resumeVal)) };
  });
}export const GET = withApiGuc(async () => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load certs, resume path, and any stored assessment answers in parallel
  const [certs, profile] = await Promise.all([
    prisma.$transaction((tx) => tx.userCertification.findMany({
      where: { userId: user.id },
      select: { certName: true },
      take: 100,
    })),
    prisma.$transaction((tx) => tx.profile.findUnique({
      where: { userId: user.id },
      select: { resumeOriginalPath: true, resumeEnhancedPath: true },
    })),
  ]);

  const certNames = certs.map((c) => c.certName);
  const certProfile = buildCertSkillProfile(certNames);

  // Attempt to extract resume text for richer skill inference
  let resumeProfile: { axis: string; value: number }[] = RADAR_AXES.map((a) => ({ axis: a, value: 0 }));
  let resumeMatchedKeywords: Record<string, string[]> = {};
  let resumeSkillsAvailable = false;

  const resumePath = profile?.resumeEnhancedPath ?? profile?.resumeOriginalPath;
  if (resumePath) {
    try {
      // Prefer the last Resume Rewriter result (already extracted text, no storage fetch needed)
      const lastRewrite = await prisma.$transaction((tx) => tx.aIToolResult.findFirst({
        where: { userId: user.id, toolType: 'resume_rewriter' },
        orderBy: { createdAt: 'desc' },
        select: { output: true },
      }));

      if (lastRewrite?.output) {
        const extracted = extractResumeSkillProfile(lastRewrite.output);
        resumeProfile = extracted.profile;
        resumeMatchedKeywords = extracted.matched;
        resumeSkillsAvailable = resumeProfile.some((p) => p.value > 0);
      } else {
        // Fallback: read the raw uploaded resume file directly from storage
        const rawText = await getMemberResumePlainText(user.id, 12000);
        if (rawText) {
          const extracted = extractResumeSkillProfile(rawText);
          resumeProfile = extracted.profile;
          resumeMatchedKeywords = extracted.matched;
          resumeSkillsAvailable = resumeProfile.some((p) => p.value > 0);
        }
      }
    } catch {
      // Resume extraction failure is non-fatal
    }
  }

  // Pull all skill_assessment records — O*NET lookups, Interest Profiler, and AI extraction
  let savedAssessmentProfile: { axis: string; value: number }[] | null = null;
  let interestProfilerProfile: { axis: string; value: number }[] | null = null;
  let aiResumeProfile: { axis: string; value: number }[] | null = null;
  let aiResumeEvidence: Record<string, string[]> = {};
  let hasInterestProfiler = false;
  let hasAiResumeExtraction = false;

  try {
    const assessments = await prisma.$transaction((tx) => tx.aIToolResult.findMany({
      where: { userId: user.id, toolType: 'skill_assessment' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { output: true, createdAt: true },
    }));

    for (const row of assessments) {
      if (!row.output) continue;
      try {
        const parsed = JSON.parse(row.output) as {
          source?: string;
          radarAxes?: Array<{ axis: string; value: number; maxValue?: number }>;
          axes?: Array<{ axis: string; score: number; evidence?: string[] }>;
          riasec?: {
            realistic?: number; investigative?: number; artistic?: number;
            social?: number; enterprising?: number; conventional?: number;
          };
        };

        // AI resume skill extraction
        if (parsed.source === 'ai_resume_extraction' && parsed.axes?.length && !aiResumeProfile) {
          hasAiResumeExtraction = true;
          aiResumeProfile = parsed.axes.map((a) => ({
            axis: a.axis,
            value: Math.min(1, (a.score ?? 0) / 100),
          }));
          for (const a of parsed.axes) {
            if (a.evidence?.length) aiResumeEvidence[a.axis] = a.evidence;
          }
        }

        // Interest Profiler result
        if (parsed.source === 'interest_profiler' && parsed.riasec && !interestProfilerProfile) {
          hasInterestProfiler = true;
          interestProfilerProfile = riasecToRadarAxes({
            realistic: parsed.riasec.realistic ?? 0,
            investigative: parsed.riasec.investigative ?? 0,
            artistic: parsed.riasec.artistic ?? 0,
            social: parsed.riasec.social ?? 0,
            enterprising: parsed.riasec.enterprising ?? 0,
            conventional: parsed.riasec.conventional ?? 0,
          });
        }

        // O*NET skill mapper result — backwards-compat: rows saved before
        // the Ethics → Service axis rename still carry `axis: 'Ethics'` in
        // their stored JSON. Project to the new name so the downstream
        // merge keys against the right axis.
        if (!parsed.source && parsed.radarAxes?.length && !savedAssessmentProfile) {
          savedAssessmentProfile = parsed.radarAxes.map((a) => ({
            axis: a.axis === 'Ethics' ? 'Service' : a.axis,
            value: (a.value ?? 0) / (a.maxValue ?? 100),
          }));
        }
      } catch {
        // Non-fatal
      }
    }
  } catch {
    // Non-fatal
  }

  // Merge strategy — prioritize most reliable signals:
  // 1. AI resume extraction (LLM-powered, most accurate resume signal)
  // 2. O*NET skill mapper (occupation-specific data)
  // 3. Interest Profiler (30-question RIASEC assessment)
  // 4. Keyword-based resume + cert matching (fallback)
  const keywordBase = mergeProfiles(certProfile, resumeProfile);

  // If AI extraction exists, use it instead of keyword matching for the resume signal
  const resumeSignal = aiResumeProfile ?? (resumeSkillsAvailable ? resumeProfile : null);
  const effectiveBase = resumeSignal
    ? RADAR_AXES.map((axis) => {
        const certVal = certProfile.find((p) => p.axis === axis)?.value ?? 0;
        const resumeVal = resumeSignal.find((p) => p.axis === axis)?.value ?? 0;
        return { axis, value: Math.min(1, Math.max(certVal, resumeVal)) };
      })
    : keywordBase;

  let finalProfile: { axis: string; value: number }[];
  if (savedAssessmentProfile) {
    // Blend O*NET lookup with IP + resume/certs
    finalProfile = RADAR_AXES.map((axis) => {
      const onet = savedAssessmentProfile!.find((p) => p.axis === axis)?.value ?? 0;
      const ip = interestProfilerProfile?.find((p) => p.axis === axis)?.value ?? 0;
      const base = effectiveBase.find((p) => p.axis === axis)?.value ?? 0;
      // Weight: O*NET 45% + IP 25% + resume/certs 30%
      return { axis, value: Math.min(1, onet * 0.45 + ip * 0.25 + base * 0.3) };
    });
  } else if (interestProfilerProfile) {
    // Blend IP with resume/certs
    finalProfile = RADAR_AXES.map((axis) => {
      const ip = interestProfilerProfile!.find((p) => p.axis === axis)?.value ?? 0;
      const base = effectiveBase.find((p) => p.axis === axis)?.value ?? 0;
      return { axis, value: Math.min(1, ip * 0.55 + base * 0.45) };
    });
  } else {
    finalProfile = effectiveBase;
  }

  // When AI extraction exists, return it as resumeSkills so the client renders evidence
  const effectiveResumeSkills = aiResumeProfile
    ? aiResumeProfile
    : (resumeSkillsAvailable ? resumeProfile : []);

  return NextResponse.json({
    skillProfile: finalProfile,
    certNames,
    resumeSkills: effectiveResumeSkills,
    resumeMatchedKeywords: hasAiResumeExtraction ? aiResumeEvidence : (resumeSkillsAvailable ? resumeMatchedKeywords : {}),
    hasCerts: certNames.length > 0,
    hasResumeSkills: resumeSkillsAvailable || hasAiResumeExtraction,
    hasSavedAssessment: !!savedAssessmentProfile,
    hasInterestProfiler,
    hasAiResumeExtraction,
  });

  } catch (error) {
    console.error('/member/skill-profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

