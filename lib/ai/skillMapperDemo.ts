import type { OnetSkill } from '@/lib/ai/onetSkills';
import { mapSkillsToRadarAxes } from '@/lib/ai/onetSkills';

type DemoOccupation = {
  code: string;
  title: string;
  keywords?: string[];
};

/** Demo occupations when O*NET API is unavailable (offline / no ONET_API_KEY). */
export const SKILL_MAPPER_DEMO_OCCUPATIONS: readonly DemoOccupation[] = [
  { code: '15-1252.00', title: 'Software Developers', keywords: ['software engineer', 'developer', 'frontend', 'backend', 'full stack'] },
  { code: '15-1212.00', title: 'Information Security Analysts', keywords: ['cybersecurity', 'security analyst', 'soc analyst', 'infosec'] },
  { code: '11-3021.00', title: 'Computer and Information Systems Managers', keywords: ['it manager', 'systems manager', 'technology manager'] },
  { code: '15-1244.00', title: 'Network and Computer Systems Administrators', keywords: ['network administrator', 'systems administrator', 'sysadmin'] },
  { code: '15-1232.00', title: 'Computer User Support Specialists', keywords: ['it support', 'help desk', 'helpdesk', 'desktop support'] },
  // Non-tech roles so demo mode is not exclusively tech-focused
  { code: '41-4012.00', title: 'Sales Representatives', keywords: ['account executive', 'account manager', 'ae', 'bdr', 'sdr', 'sales rep', 'business development', 'outside sales', 'inside sales'] },
  { code: '41-4011.00', title: 'Sales Representatives, Wholesale and Manufacturing, Technical and Scientific Products', keywords: ['technical sales', 'solutions consultant', 'pre-sales', 'saas sales', 'sales engineer'] },
  { code: '11-2022.00', title: 'Sales Managers', keywords: ['sales manager', 'revenue leader', 'sales leadership', 'quota', 'pipeline manager'] },
  { code: '11-2021.00', title: 'Marketing Managers', keywords: ['marketing manager', 'growth marketing', 'campaign manager', 'demand generation', 'brand manager'] },
  { code: '13-1082.00', title: 'Project Management Specialists', keywords: ['project manager', 'project management', 'program manager', 'implementation manager', 'scrum'] },
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

function normalizeQuery(q: string) {
  return q.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Minimum normalized keyword length for `query.includes(keyword)` matching (avoids 2-char false positives like "ae" in "aerospace"). */
const MIN_REVERSE_SUBSTRING_MATCH_LEN = 3;

export function isDemoOccupationCode(code: string) {
  return SKILL_MAPPER_DEMO_OCCUPATIONS.some((o) => o.code === code);
}

export function searchDemoOccupations(q: string) {
  const qn = normalizeQuery(q);
  if (qn.length < 2) return [];
  return SKILL_MAPPER_DEMO_OCCUPATIONS.filter((o) => {
    const haystack = [o.title, o.code, ...(o.keywords ?? [])].map(normalizeQuery);
    return haystack.some((value) => {
      if (value.includes(qn)) return true;
      if (qn.includes(value) && value.length >= MIN_REVERSE_SUBSTRING_MATCH_LEN) return true;
      return false;
    });
  });
}
