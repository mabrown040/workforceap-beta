import type { OnetSkill } from '@/lib/ai/onetSkills';
import { mapSkillsToRadarAxes } from '@/lib/ai/onetSkills';

/** Demo occupations when O*NET API is unavailable (offline / no ONET_API_KEY). */
export const SKILL_MAPPER_DEMO_OCCUPATIONS = [
  { code: '15-1252.00', title: 'Software Developers' },
  { code: '15-1212.00', title: 'Information Security Analysts' },
  { code: '11-3021.00', title: 'Computer and Information Systems Managers' },
  { code: '15-1244.00', title: 'Network and Computer Systems Administrators' },
  { code: '15-1232.00', title: 'Computer User Support Specialists' },
  // Non-tech roles so demo mode is not exclusively tech-focused
  { code: '41-4012.00', title: 'Sales Representatives' },
  { code: '13-1082.00', title: 'Project Management Specialists' },
] as const;

/** Representative skills so the radar shows meaningful spread (maps across axes). */
export const SKILL_MAPPER_DEMO_SKILLS: OnetSkill[] = [
  { id: 'd1', name: 'Programming', score: 92, category: 'skill' },
  { id: 'd2', name: 'Critical Thinking', score: 88, category: 'skill' },
  { id: 'd3', name: 'Complex Problem Solving', score: 90, category: 'skill' },
  { id: 'd4', name: 'Systems Analysis', score: 85, category: 'skill' },
  { id: 'd5', name: 'Operations Analysis', score: 78, category: 'skill' },
  { id: 'd6', name: 'User Interface Design', score: 72, category: 'skill' },
  { id: 'd7', name: 'Social Perceptiveness', score: 74, category: 'skill' },
  { id: 'd8', name: 'Active Learning', score: 86, category: 'skill' },
  { id: 'd9', name: 'Writing', score: 70, category: 'skill' },
  { id: 'd10', name: 'Technology Design', score: 80, category: 'skill' },
];

/**
 * Demo skills for sales / non-tech roles.
 * Weighted toward Strategy and Ethics axes to reflect actual O*NET importance data
 * for Sales Representatives (41-4012.00) and similar occupations.
 */
export const SKILL_MAPPER_DEMO_SKILLS_SALES: OnetSkill[] = [
  { id: 'sd1', name: 'Active Listening', score: 88, category: 'skill' },
  { id: 'sd2', name: 'Speaking', score: 85, category: 'skill' },
  { id: 'sd3', name: 'Sales and Marketing', score: 82, category: 'skill' },
  { id: 'sd4', name: 'Persuasion', score: 80, category: 'skill' },
  { id: 'sd5', name: 'Service Orientation', score: 78, category: 'skill' },
  { id: 'sd6', name: 'Negotiation', score: 76, category: 'skill' },
  { id: 'sd7', name: 'Critical Thinking', score: 72, category: 'skill' },
  { id: 'sd8', name: 'Social Perceptiveness', score: 74, category: 'skill' },
  { id: 'sd9', name: 'Coordination', score: 68, category: 'skill' },
  { id: 'sd10', name: 'Monitoring', score: 65, category: 'skill' },
];

/** Codes that use the sales demo skill set instead of the default tech set. */
const SALES_DEMO_CODES = new Set(['41-4012.00', '41-4011.00', '11-2022.00', '11-2021.00']);

export function getDemoRadarForCode(code: string) {
  let skills: OnetSkill[];
  if (SALES_DEMO_CODES.has(code)) {
    skills = SKILL_MAPPER_DEMO_SKILLS_SALES;
  } else if (code === '15-1212.00') {
    skills = SKILL_MAPPER_DEMO_SKILLS.map((s, i) => ({ ...s, score: Math.max(40, s.score - (i % 3) * 5) }));
  } else {
    skills = SKILL_MAPPER_DEMO_SKILLS;
  }
  return {
    occupationCode: code,
    skills: skills.slice(0, 20),
    radarAxes: mapSkillsToRadarAxes(skills),
    totalSkills: skills.length,
    demo: true as const,
  };
}

export function searchDemoOccupations(q: string) {
  const qn = q.trim().toLowerCase();
  if (qn.length < 2) return [];
  return SKILL_MAPPER_DEMO_OCCUPATIONS.filter(
    (o) => o.title.toLowerCase().includes(qn) || o.code.includes(qn)
  );
}
