import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { mapSkillsToRadarAxes } from '@/lib/ai/onetSkills';
import type { OnetSkill } from '@/lib/ai/onetSkills';

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
  // Strategy
  ['project management', 'Strategy', 80], ['pmp', 'Strategy', 85],
  ['strategy', 'Strategy', 75], ['leadership', 'Strategy', 75],
  ['management', 'Strategy', 70], ['planning', 'Strategy', 70],
  ['operations', 'Strategy', 70], ['budget', 'Strategy', 65],
  ['stakeholder', 'Strategy', 70], ['cross-functional', 'Strategy', 70],
  ['agile', 'Strategy', 75], ['scrum', 'Strategy', 75],
  ['product management', 'Strategy', 80], ['business development', 'Strategy', 70],
  ['sales', 'Strategy', 65], ['account management', 'Strategy', 68],
  ['negotiation', 'Strategy', 65], ['quota', 'Strategy', 60],
  // Ethics
  ['compliance', 'Ethics', 70], ['hipaa', 'Ethics', 75],
  ['gdpr', 'Ethics', 75], ['privacy', 'Ethics', 70],
  ['diversity', 'Ethics', 65], ['inclusion', 'Ethics', 65],
  ['customer service', 'Ethics', 65], ['communication', 'Ethics', 65],
  ['mentoring', 'Ethics', 65], ['coaching', 'Ethics', 65],
  ['collaboration', 'Ethics', 60], ['teamwork', 'Ethics', 60],
  ['interpersonal', 'Ethics', 65], ['empathy', 'Ethics', 65],
  // Research
  ['research', 'Research', 75], ['writing', 'Research', 70],
  ['technical writing', 'Research', 80], ['documentation', 'Research', 70],
  ['content', 'Research', 65], ['mba', 'Research', 70],
  ['degree', 'Research', 60], ['certification', 'Research', 65],
  ['training', 'Research', 60], ['learning', 'Research', 60],
  ['curriculum', 'Research', 65], ['analysis', 'Research', 65],
];

const RADAR_AXES = ['Analytics', 'Engineering', 'Design', 'Strategy', 'Ethics', 'Research'];

function extractResumeSkillProfile(resumeText: string): { axis: string; value: number }[] {
  const lower = resumeText.toLowerCase();
  const axisScores: Record<string, number[]> = {};
  RADAR_AXES.forEach((a) => { axisScores[a] = []; });

  for (const [keyword, axis, score] of RESUME_SKILL_HINTS) {
    if (lower.includes(keyword)) {
      axisScores[axis].push(score);
    }
  }

  return RADAR_AXES.map((axis) => {
    const scores = axisScores[axis];
    if (scores.length === 0) return { axis, value: 0 };
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return { axis, value: avg / 100 };
  });
}

// Cert name → skill score boosts per axis
const CERT_AXIS_MAP: Record<string, Partial<Record<string, number>>> = {
  'CompTIA A+': { Engineering: 75 },
  'CompTIA Security+': { Engineering: 80, Ethics: 70 },
  'CompTIA Network+': { Engineering: 75 },
  'Google IT Support': { Engineering: 70 },
  'IBM AI Professional Developer': { Analytics: 80, Engineering: 75 },
  'Google Data Analytics': { Analytics: 85 },
  'Google Project Management': { Strategy: 80 },
  'Salesforce Administrator': { Engineering: 65, Strategy: 65 },
  'AWS Cloud Practitioner': { Engineering: 75 },
  'Microsoft Azure Fundamentals': { Engineering: 70 },
  'Healthcare Administration': { Ethics: 75, Strategy: 70 },
  'Medical Coding': { Research: 70, Ethics: 70 },
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
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load certs, resume path, and any stored assessment answers in parallel
  const [certs, profile] = await Promise.all([
    prisma.userCertification.findMany({
      where: { userId: user.id },
      select: { certName: true },
    }),
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { resumeOriginalPath: true, resumeEnhancedPath: true },
    }),
  ]);

  const certNames = certs.map((c) => c.certName);
  const certProfile = buildCertSkillProfile(certNames);

  // Attempt to extract resume text for richer skill inference
  let resumeProfile: { axis: string; value: number }[] = RADAR_AXES.map((a) => ({ axis: a, value: 0 }));
  let resumeSkillsAvailable = false;

  const resumePath = profile?.resumeEnhancedPath ?? profile?.resumeOriginalPath;
  if (resumePath) {
    try {
      // Load resume text from the last Resume Rewriter result (stored in DB, no storage fetch needed)
      const lastRewrite = await prisma.aIToolResult.findFirst({
        where: { userId: user.id, toolType: 'resume_rewriter' },
        orderBy: { createdAt: 'desc' },
        select: { output: true },
      });

      if (lastRewrite?.output) {
        resumeProfile = extractResumeSkillProfile(lastRewrite.output);
        resumeSkillsAvailable = resumeProfile.some((p) => p.value > 0);
      }
    } catch {
      // Resume extraction failure is non-fatal
    }
  }

  // Also check if we have a saved skill assessment we can pull axes from
  let savedAssessmentProfile: { axis: string; value: number }[] | null = null;
  try {
    const lastAssessment = await prisma.aIToolResult.findFirst({
      where: { userId: user.id, toolType: 'skill_assessment' },
      orderBy: { createdAt: 'desc' },
      select: { output: true },
    });
    if (lastAssessment?.output) {
      const parsed = JSON.parse(lastAssessment.output) as {
        radarAxes?: Array<{ axis: string; value: number; maxValue?: number }>;
      };
      if (parsed.radarAxes?.length) {
        savedAssessmentProfile = parsed.radarAxes.map((a) => ({
          axis: a.axis,
          value: (a.value ?? 0) / (a.maxValue ?? 100),
        }));
      }
    }
  } catch {
    // Non-fatal
  }

  // Merge: cert profile + resume signals → normalized member profile
  const mergedProfile = mergeProfiles(certProfile, resumeProfile);

  // If we have a saved O*NET skill assessment use that as the primary profile
  const finalProfile = savedAssessmentProfile ?? mergedProfile;

  return NextResponse.json({
    skillProfile: finalProfile,
    certNames,
    resumeSkills: resumeSkillsAvailable ? resumeProfile : [],
    hasCerts: certNames.length > 0,
    hasResumeSkills: resumeSkillsAvailable,
    hasSavedAssessment: !!savedAssessmentProfile,
  });
}
