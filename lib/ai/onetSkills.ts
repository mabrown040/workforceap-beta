/**
 * O*NET Skills Data Utility for Skill Mapper.
 *
 * Delegates to {@link '@/lib/onet/client'} — correct O*NET Web Services API v2 paths
 * (`online/search`, `online/occupations/.../summary/skills`) and `X-API-Key` via `ONET_API_KEY`.
 *
 * @see https://services.onetcenter.org/reference/start/overview
 */

import {
  searchOccupations as onetSearchOccupations,
  getOccupationSkills as onetFetchOccupationSkills,
} from '@/lib/onet/client';

export interface OnetSkill {
  id: string;
  name: string;
  score: number;
  category: 'skill' | 'knowledge' | 'ability' | 'technology';
}

export interface OnetOccupation {
  code: string;
  title: string;
  description: string;
}

export async function searchOccupations(keyword: string): Promise<OnetOccupation[]> {
  const rows = await onetSearchOccupations(keyword);
  return rows.map((o) => ({
    code: o.code,
    title: o.title,
    description: '',
  }));
}

function scoreFromRatings(importance: number | null, level: number | null): number {
  // O*NET can return either normalized percentages (0–100) or raw scales (importance 1–5, level 0–7).
  if (importance != null && importance > 0) {
    if (importance > 5) return Math.min(100, Math.round(importance));
    return Math.min(100, Math.round((importance / 5) * 100));
  }
  if (level != null && level > 0) {
    if (level > 7) return Math.min(100, Math.round(level));
    return Math.min(100, Math.round((level / 7) * 100));
  }
  return 0;
}

export async function getOccupationSkills(occupationCode: string): Promise<OnetSkill[]> {
  const rows = await onetFetchOccupationSkills(occupationCode);
  return rows
    .map((r, i) => ({
      id: `s-${i}`,
      name: r.name,
      score: scoreFromRatings(r.importance, r.level),
      category: 'skill' as const,
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Curated skill categories for radar chart visualization.
 * Maps O*NET skill names to the 6 radar axes used in the Skill Mapper design.
 * 
 * NOTE: This mapping uses an expanded keyword list based on actual O*NET skill names.
 * When no skills match an axis, value is 0 (no fallback) to show genuine gaps.
 * 
 * UPDATED: Design axis now includes fallback logic using course mappings when O*NET
 * returns empty abilities/knowledge for technical occupations.
 */
export function mapSkillsToRadarAxes(
  skills: OnetSkill[],
  options?: {
    occupationCode?: string;
    occupationTitle?: string;
    fallbackDesignScore?: number; // From course mappings
  }
): { axis: string; value: number; maxValue: number; hasData: boolean }[] {
  const axes = [
    {
      axis: 'Analytics',
      keywords: [
        'mathematics', 'math', 'data', 'statistics', 'analysis', 'analytical', 'critical thinking', 'problem solving',
        'deductive reasoning', 'inductive reasoning', 'mathematical reasoning', 'number facility', 'quantitative',
        'logic', 'logical', 'analytics', 'modeling', 'forecasting', 'metrics', 'statistical', 'data analysis',
        'information ordering', 'category flexibility', 'fluency of ideas', 'originality', 'visualization'
      ],
    },
    {
      axis: 'Engineering',
      keywords: [
        'programming', 'systems', 'technology', 'engineering', 'operations monitoring', 'equipment', 'computers', 'installation',
        'technical', 'software', 'hardware', 'network', 'database', 'troubleshooting', 'quality control',
        'operation and control', 'operation monitoring', 'equipment maintenance', 'repairing', 'mechanical',
        'electronics', 'circuit', 'infrastructure', 'platform', 'architecture', 'development environment',
        'debugging', 'testing', 'deployment', 'devops', 'cloud', 'automation', 'scripting', 'coding'
      ],
    },
    {
      axis: 'Design',
      keywords: [
        // ── Exact O*NET ability names (from /abilities endpoint) ──
        'originality', 'fluency of ideas', 'flexibility of closure', 'speed of closure',
        'spatial orientation', 'visualization', 'perceptual speed', 'selective attention',
        'time sharing', 'near vision', 'far vision', 'visual color discrimination',
        'depth perception', 'glare sensitivity',
        // ── Exact O*NET knowledge names (from /knowledge endpoint) ──
        'fine arts', 'design', 'communications and media', 'history and archeology',
        'philosophy and theology', 'sociology and anthropology', 'foreign language',
        // ── Exact O*NET skill names related to design/creative ──
        'writing', 'reading comprehension',
        'thinking creatively', 'updating and using relevant knowledge',
        // ── Core design terms (substring match) ──
        'ux', 'ui', 'graphic', 'visual', 'aesthetic', 'typography', 'color', 'branding',
        'prototyping', 'wireframing', 'user experience', 'user interface', 'interaction',
        'artistic', 'illustration', 'multimedia', 'animation', 'video production',
        'photography', 'layout', 'drafting', 'blueprint', 'sketch', 'storyboard',
        'copywriting', 'content creation', 'editing', 'publishing', 'media',
        'advertising', 'marketing communications', 'creative direction', 'art direction',
        // ── Broad creative problem-solving (catches "innovation" type skills) ──
        'idea generation', 'concept development', 'creative problem', 'design thinking',
        'imagining', 'inventing', 'innovating', 'brainstorming',
      ],
    },
    {
      axis: 'Strategy',
      keywords: [
        'management', 'planning', 'coordination', 'leadership', 'decision', 'monitoring', 'judgment', 'operations analysis',
        'complex problem solving', 'systems analysis', 'systems evaluation', 'strategic', 'strategy', 'organizing',
        'prioritization', 'delegation', 'supervision', 'direction', 'administration', 'governance', 'oversight',
        'business acumen', 'executive', 'vision', 'roadmap', 'stakeholder', 'cross-functional', 'alignment',
        'resource allocation', 'budget', 'forecasting', 'risk assessment', 'change management', 'negotiation',
        'sales and marketing', 'selling', 'marketing', 'sales'
      ],
    },
    {
      axis: 'Ethics',
      keywords: [
        'social', 'service', 'compliance', 'regulation', 'governance', 'integrity', 'dependability', 'concern for others',
        'social perceptiveness', 'persuasion', 'negotiation', 'instructing', 'service orientation', 'ethical',
        'responsibility', 'reliability', 'honesty', 'transparency', 'accountability', 'fairness', 'equity',
        'privacy', 'security', 'confidentiality', 'professionalism', 'empathy', 'emotional intelligence',
        'cultural awareness', 'diversity', 'inclusion', 'collaboration', 'teamwork', 'interpersonal', 'communication',
        'active listening', 'speaking'
      ],
    },
    {
      axis: 'Research',
      keywords: [
        'research', 'writing', 'reading', 'learning', 'science', 'active learning', 'investigation', 'studying',
        'scientific', 'experimentation', 'hypothesis', 'literature review', 'academic', 'scholarly', 'publication',
        'documentation', 'technical writing', 'content creation', 'information literacy', 'synthesis',
        'library', 'archival', 'data collection', 'survey', 'interview', 'observation', 'qualitative', 'quantitative',
        'methodology', 'peer review', 'citation', 'bibliography', 'knowledge management', 'continuous learning'
      ],
    },
  ];

  return axes.map(({ axis, keywords }) => {
    const matching = skills.filter((s) => 
      keywords.some((kw) => s.name.toLowerCase().includes(kw.toLowerCase()))
    );
    
    // Check if we need fallback for Design axis
    let hasData = matching.length > 0;
    let avgScore = hasData
      ? Math.round(matching.reduce((sum, s) => sum + s.score, 0) / matching.length)
      : 0;
    
    // Apply fallback for Design axis when O*NET returns empty
    if (axis === 'Design' && !hasData && options?.fallbackDesignScore) {
      avgScore = options.fallbackDesignScore;
      hasData = true; // Mark as having data so it displays
    }
    
    return { axis, value: avgScore, maxValue: 100, hasData };
  });
}
