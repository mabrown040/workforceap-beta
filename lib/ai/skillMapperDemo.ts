import type { OnetSkill } from '@/lib/ai/onetSkills';
import { mapSkillsToRadarAxes } from '@/lib/ai/onetSkills';

/** Demo occupations when O*NET API is unavailable (offline / no ONET_API_KEY). */
export const SKILL_MAPPER_DEMO_OCCUPATIONS = [
  { code: '15-1252.00', title: 'Software Developers' },
  { code: '15-1212.00', title: 'Information Security Analysts' },
  { code: '11-3021.00', title: 'Computer and Information Systems Managers' },
  { code: '15-1244.00', title: 'Network and Computer Systems Administrators' },
  { code: '15-1232.00', title: 'Computer User Support Specialists' },
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

export function getDemoRadarForCode(code: string) {
  const skills =
    code === '15-1212.00'
      ? SKILL_MAPPER_DEMO_SKILLS.map((s, i) => ({ ...s, score: Math.max(40, s.score - (i % 3) * 5) }))
      : SKILL_MAPPER_DEMO_SKILLS;
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
