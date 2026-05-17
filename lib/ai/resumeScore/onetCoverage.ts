import { prisma } from '@/lib/db/prisma';
import { embedTexts, cosineSimilarity, isGeminiEmbedConfigured } from '@/lib/ai/geminiEmbed';
import type { ResumeFeatures } from './types';

export interface OnetSkillRef {
  name: string;
  importance: number; // 0-100
  source: 'skill' | 'tech';
}

export interface SkillMatch {
  skill: OnetSkillRef;
  bestSimilarity: number; // 0-1
  bestBulletLine: number | null;
  bestBulletExcerpt: string | null;
  covered: boolean; // similarity >= COVERAGE_THRESHOLD
}

export interface OnetCoverageResult {
  onetCode: string;
  title: string;
  matches: SkillMatch[];
  coverageScore: number; // 0-100 weighted by importance
  topGaps: SkillMatch[]; // uncovered, sorted by importance desc
}

const COVERAGE_THRESHOLD = 0.55;
const TOP_SKILLS_PER_OCC = 20;

async function fetchTopSkills(onetCode: string): Promise<OnetSkillRef[]> {
  const [skills, techs] = await Promise.all([
    prisma.onetOccupationSkill.findMany({
      where: { onetCode },
      orderBy: { importance: 'desc' },
      take: TOP_SKILLS_PER_OCC,
    }),
    prisma.onetOccupationTech.findMany({
      where: { onetCode },
      take: 10,
    }),
  ]);
  const skillRefs: OnetSkillRef[] = skills
    .filter((s) => (s.importance ?? 0) > 0)
    .map((s) => ({
      name: s.skillName,
      importance: Math.max(0, Math.min(100, s.importance ?? 0)),
      source: 'skill' as const,
    }));
  // Techs don't carry importance — pin at 60 (relevant but secondary)
  const techRefs: OnetSkillRef[] = techs.map((t) => ({
    name: t.technologyName,
    importance: 60,
    source: 'tech' as const,
  }));
  return [...skillRefs, ...techRefs];
}

function keywordHit(skillName: string, resumeText: string): boolean {
  const needle = skillName.toLowerCase();
  const hay = resumeText.toLowerCase();
  if (hay.includes(needle)) return true;
  // Try first-word match for multiword skills ("Sales Force Software" -> "salesforce")
  const compact = needle.replace(/\s+/g, '');
  if (compact.length > 4 && hay.includes(compact)) return true;
  return false;
}

/**
 * Compute O*NET coverage for one target occupation against the parsed resume.
 *
 * Strategy:
 *   1. Pull top-20 skills (by importance) + top-10 technologies from local O*NET cache.
 *   2. For each skill, check keyword hit in raw resume text (fast path).
 *   3. For misses, embed-match against achievement bullets (Gemini). Skipped if embeddings unavailable.
 *   4. Composite coverage = importance-weighted % of covered skills.
 */
export async function scoreOnetCoverage(
  features: ResumeFeatures,
  onetCode: string,
  title: string,
): Promise<OnetCoverageResult> {
  const skills = await fetchTopSkills(onetCode);
  if (skills.length === 0) {
    return { onetCode, title, matches: [], coverageScore: 0, topGaps: [] };
  }

  const matches: SkillMatch[] = [];
  const skillsNeedingEmbed: OnetSkillRef[] = [];

  // Pass 1: keyword hits
  for (const skill of skills) {
    if (keywordHit(skill.name, features.rawText)) {
      matches.push({
        skill,
        bestSimilarity: 1.0,
        bestBulletLine: null,
        bestBulletExcerpt: null,
        covered: true,
      });
    } else {
      skillsNeedingEmbed.push(skill);
    }
  }

  // Pass 2: embedding match against achievement bullets (only if Gemini available + we have bullets)
  if (isGeminiEmbedConfigured() && skillsNeedingEmbed.length > 0 && features.bullets.length > 0) {
    const skillTexts = skillsNeedingEmbed.map((s) => `${s.name} (skill important to ${title})`);
    const bulletTexts = features.bullets.map((b) => b.text);
    const [skillVecs, bulletVecs] = await Promise.all([
      embedTexts(skillTexts),
      embedTexts(bulletTexts),
    ]);
    for (let i = 0; i < skillsNeedingEmbed.length; i++) {
      const sv = skillVecs[i];
      if (!sv) {
        matches.push({
          skill: skillsNeedingEmbed[i],
          bestSimilarity: 0,
          bestBulletLine: null,
          bestBulletExcerpt: null,
          covered: false,
        });
        continue;
      }
      let best = -1;
      let bestIdx = -1;
      for (let j = 0; j < bulletVecs.length; j++) {
        const bv = bulletVecs[j];
        if (!bv) continue;
        const sim = cosineSimilarity(sv, bv);
        if (sim > best) {
          best = sim;
          bestIdx = j;
        }
      }
      const bestBullet = bestIdx >= 0 ? features.bullets[bestIdx] : null;
      matches.push({
        skill: skillsNeedingEmbed[i],
        bestSimilarity: best < 0 ? 0 : best,
        bestBulletLine: bestBullet?.line ?? null,
        bestBulletExcerpt: bestBullet ? bestBullet.text.slice(0, 100) : null,
        covered: best >= COVERAGE_THRESHOLD,
      });
    }
  } else {
    // No embeddings — fall through with hard misses
    for (const skill of skillsNeedingEmbed) {
      matches.push({
        skill,
        bestSimilarity: 0,
        bestBulletLine: null,
        bestBulletExcerpt: null,
        covered: false,
      });
    }
  }

  // Importance-weighted coverage score
  const totalWeight = matches.reduce((s, m) => s + m.skill.importance, 0);
  const coveredWeight = matches.filter((m) => m.covered).reduce((s, m) => s + m.skill.importance, 0);
  const coverageScore = totalWeight === 0 ? 0 : Math.round((coveredWeight / totalWeight) * 100);

  const topGaps = matches
    .filter((m) => !m.covered)
    .sort((a, b) => b.skill.importance - a.skill.importance)
    .slice(0, 5);

  return { onetCode, title, matches, coverageScore, topGaps };
}

export { COVERAGE_THRESHOLD, TOP_SKILLS_PER_OCC };
