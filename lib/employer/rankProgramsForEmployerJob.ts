import { PROGRAMS, type Program } from '@/lib/content/programs';

export type ProgramMatchConfidence = 'strong' | 'good' | 'consider';

export type RankedProgramMatch = {
  slug: string;
  title: string;
  score: number;
  confidence: ProgramMatchConfidence;
  rationale: string;
};

type SkillMatchKind = 'phrase' | 'token' | 'short-token';
type RoleFamily =
  | 'customer-support'
  | 'customer-success'
  | 'it-support'
  | 'software-engineering'
  | 'data-analytics'
  | 'project-management'
  | 'sales-business'
  | 'general';

type MatchableText = {
  haystackNorm: string;
  tokenSet: Set<string>;
};

const LOW_SIGNAL_SKILL_WEIGHTS: Record<string, number> = {
  /** Slightly above 1 so HTML + token hit reaches score 2 for marketing-style roles (see unit test). */
  html: 1.5,
};

type RoleFamilySignalConfig = {
  roleFamily: Exclude<RoleFamily, 'general'>;
  phrases: string[];
  tokens?: string[];
  titlePhrases?: string[];
};

type DetectedRoleFamily = {
  primary: RoleFamily;
  scores: Partial<Record<RoleFamily, number>>;
  supportingSignals: string[];
  titleSignals: string[];
};

const ROLE_FAMILY_SIGNALS: RoleFamilySignalConfig[] = [
  {
    roleFamily: 'customer-support',
    phrases: [
      'customer support',
      'customer service',
      'call center',
      'contact center',
      'support representative',
      'support specialist',
      'support associate',
      'resolve concerns',
      'handle inquiries',
      'inbound calls',
      'outbound calls',
      'de escalate',
      'case management',
      'billing support',
      'ticketing',
    ],
    tokens: ['csr', 'tickets', 'phones', 'escalations'],
    titlePhrases: ['customer support', 'customer service', 'support representative', 'support specialist'],
  },
  {
    roleFamily: 'customer-success',
    phrases: [
      'customer success',
      'account management',
      'account manager',
      'client success',
      'client relationship',
      'relationship management',
      'renewals',
      'upsell',
      'cross sell',
      'book of business',
      'adoption',
      'onboarding',
      'retention',
      'quarterly business review',
    ],
    tokens: ['csm', 'renewal', 'retention'],
    titlePhrases: ['customer success manager', 'customer success', 'account manager'],
  },
  {
    roleFamily: 'it-support',
    phrases: [
      'technical support',
      'tech support',
      'help desk',
      'service desk',
      'desktop support',
      'it support',
      'troubleshoot hardware',
      'troubleshoot software',
      'active directory',
      'password reset',
      'device setup',
      'hardware support',
      'end user support',
      'windows support',
      'network troubleshooting',
    ],
    tokens: ['sla', 'vpn', 'desktop', 'laptop', 'printer'],
    titlePhrases: ['it support', 'help desk', 'service desk', 'desktop support', 'technical support'],
  },
  {
    roleFamily: 'software-engineering',
    phrases: [
      'software engineer',
      'software developer',
      'full stack',
      'backend engineer',
      'frontend engineer',
      'front end',
      'back end',
      'build applications',
      'build features',
      'application development',
      'api development',
      'distributed systems',
      'test driven development',
      'code reviews',
      'version control',
      'object oriented',
      'microservices',
    ],
    tokens: ['javascript', 'typescript', 'react', 'node', 'java', 'git', 'docker', 'kubernetes', 'apis'],
    titlePhrases: ['software engineer', 'software developer', 'full stack', 'developer'],
  },
  {
    roleFamily: 'data-analytics',
    phrases: [
      'data analyst',
      'business intelligence',
      'data visualization',
      'dashboarding',
      'reporting',
      'tableau',
      'power bi',
      'sql queries',
      'analyze trends',
      'kpi reporting',
      'spreadsheet analysis',
      'data quality',
      'build dashboards',
    ],
    tokens: ['sql', 'tableau', 'analytics', 'analyst', 'dashboards', 'reporting'],
    titlePhrases: ['data analyst', 'business analyst', 'analytics'],
  },
  {
    roleFamily: 'project-management',
    phrases: [
      'project manager',
      'program manager',
      'scrum master',
      'project coordination',
      'project planning',
      'stakeholder management',
      'risk management',
      'project lifecycle',
      'cross functional',
      'agile',
      'scrum',
      'kanban',
      'delivery roadmap',
    ],
    tokens: ['pmo', 'sprint', 'roadmap', 'milestones'],
    titlePhrases: ['project manager', 'program manager', 'scrum master', 'project coordinator'],
  },
  {
    roleFamily: 'sales-business',
    phrases: [
      'business development',
      'sales pipeline',
      'quota attainment',
      'prospecting',
      'lead generation',
      'closing deals',
      'revenue growth',
      'sales operations',
      'market research',
      'digital marketing',
      'e commerce',
      'campaign management',
      'seo',
      'sem',
    ],
    tokens: ['quota', 'prospecting', 'sales', 'marketing', 'crm'],
    titlePhrases: ['sales', 'business development', 'marketing'],
  },
];

const PROGRAM_ROLE_FAMILY_ALIGNMENT: Partial<Record<string, RoleFamily[]>> = {
  'it-support-professional-certificate-ibm': ['customer-support', 'it-support'],
  'comptia-a-professional-certificate': ['it-support'],
  'comptia-network-professional-certificate': ['it-support'],
  'it-automation-with-python-google': ['it-support'],
  'ai-practitioner-professional-certificate-aws': ['software-engineering', 'data-analytics'],
  'software-developer-professional-certificate-ibm': ['software-engineering', 'data-analytics'],
  'ai-professional-developer-certificate-ibm': ['software-engineering', 'data-analytics'],
  'aws-cloud-technology-amazon': ['software-engineering', 'it-support'],
  'data-analytics-professional-certificate-google': ['data-analytics'],
  'data-science-professional-certificate-ibm': ['data-analytics', 'software-engineering'],
  'project-management-professional-certificate-microsoft': ['project-management', 'sales-business'],
  'digital-marketing-e-commerce-google': ['sales-business', 'customer-success'],
  'ux-design-professional-certificate-google': ['sales-business', 'software-engineering'],
};

function normalizeHaystack(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#.\s/]/g, ' ');
}

function tokenize(s: string): string[] {
  return normalizeHaystack(s)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
}

function tokenizeAll(s: string): string[] {
  return normalizeHaystack(s)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function classifySkillMatch(skill: string): SkillMatchKind {
  const normalized = normalizeHaystack(skill).trim();
  const skillTokens = tokenizeAll(normalized);

  if (skillTokens.length > 1) return 'phrase';

  const singleToken = skillTokens[0] ?? '';
  if (singleToken.length <= 2) return 'short-token';
  if (/^[a-z0-9+#./]+$/.test(singleToken) && /[+#./]|\d/.test(singleToken)) return 'token';
  if (/^[a-z]{2,4}$/.test(singleToken)) return 'token';
  return 'phrase';
}

function buildMatchableText(haystack: string): MatchableText {
  const haystackNorm = normalizeHaystack(haystack);
  return {
    haystackNorm,
    tokenSet: new Set(tokenizeAll(haystackNorm)),
  };
}

function hasPhraseBoundaryMatch(haystackNorm: string, phraseNorm: string): boolean {
  const compactHaystack = haystackNorm.replace(/\s+/g, ' ').trim();
  if (!compactHaystack || !phraseNorm) return false;
  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(phraseNorm)}(?:$|\\s)`);
  return pattern.test(compactHaystack);
}

function skillMatchesText(skill: string, matchableText: MatchableText): boolean {
  const skillNorm = normalizeHaystack(skill).replace(/\s+/g, ' ').trim();
  if (!skillNorm) return false;

  switch (classifySkillMatch(skill)) {
    case 'short-token':
    case 'token':
      return matchableText.tokenSet.has(skillNorm);
    case 'phrase':
      return hasPhraseBoundaryMatch(matchableText.haystackNorm, skillNorm);
    default:
      return false;
  }
}

function detectRoleFamily(haystack: string, matchableText: MatchableText): DetectedRoleFamily {
  const [title = ''] = haystack.split(/\n+/);
  const titleNorm = normalizeHaystack(title).replace(/\s+/g, ' ').trim();
  const scores: Partial<Record<RoleFamily, number>> = {};
  const supportingSignals: string[] = [];
  const titleSignals: string[] = [];

  for (const config of ROLE_FAMILY_SIGNALS) {
    let score = 0;
    for (const phrase of config.phrases) {
      const phraseNorm = normalizeHaystack(phrase).replace(/\s+/g, ' ').trim();
      if (hasPhraseBoundaryMatch(matchableText.haystackNorm, phraseNorm)) {
        score += 3;
        supportingSignals.push(phrase);
      }
    }
    for (const token of config.tokens ?? []) {
      const tokenNorm = normalizeHaystack(token).trim();
      if (tokenNorm && matchableText.tokenSet.has(tokenNorm)) {
        score += 1;
        supportingSignals.push(token);
      }
    }
    for (const phrase of config.titlePhrases ?? []) {
      const phraseNorm = normalizeHaystack(phrase).replace(/\s+/g, ' ').trim();
      if (hasPhraseBoundaryMatch(titleNorm, phraseNorm)) {
        score += 4;
        titleSignals.push(phrase);
      }
    }
    if (score > 0) scores[config.roleFamily] = score;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [primary, primaryScore] = ranked[0] ?? ['general', 0];
  const [, secondaryScore] = ranked[1] ?? ['general', 0];
  const chosenPrimary = primaryScore >= 4 || primaryScore >= secondaryScore + 2 ? (primary as RoleFamily) : 'general';

  return {
    primary: chosenPrimary,
    scores,
    supportingSignals: Array.from(new Set(supportingSignals)),
    titleSignals: Array.from(new Set(titleSignals)),
  };
}

function roleFamilyWeight(program: Program, detectedRoleFamily: DetectedRoleFamily): number {
  if (detectedRoleFamily.primary === 'general') return 0;
  const alignedFamilies = PROGRAM_ROLE_FAMILY_ALIGNMENT[program.slug] ?? [];
  if (alignedFamilies.includes(detectedRoleFamily.primary)) return 14;
  if (alignedFamilies.length > 0) return -6;
  return 0;
}


function roleFamilyTitleBonus(program: Program, detectedRoleFamily: DetectedRoleFamily): number {
  const titleNorm = normalizeHaystack(program.title);

  switch (detectedRoleFamily.primary) {
    case 'software-engineering':
      if (/(software developer|developer)/.test(titleNorm)) return 4;
      if (/(ai professional developer)/.test(titleNorm)) return 2;
      return 0;
    case 'data-analytics':
      if (/(data analytics|data analyst)/.test(titleNorm)) return 4;
      if (/data science/.test(titleNorm)) return 2;
      return 0;
    case 'it-support':
      if (/(it support|comptia a\+)/.test(titleNorm)) return 3;
      return 0;
    case 'customer-support':
      if (/it support/.test(titleNorm)) return 2;
      return 0;
    case 'project-management':
      if (/project management/.test(titleNorm)) return 4;
      return 0;
    case 'customer-success':
      if (/(digital marketing|project management)/.test(titleNorm)) return 1;
      return 0;
    case 'sales-business':
      if (/(digital marketing|project management|ux design)/.test(titleNorm)) return 2;
      return 0;
    default:
      return 0;
  }
}

function scoreProgram(
  program: Program,
  matchableText: MatchableText,
  tokens: Set<string>,
  detectedRoleFamily: DetectedRoleFamily
): number {
  let score = roleFamilyWeight(program, detectedRoleFamily) + roleFamilyTitleBonus(program, detectedRoleFamily);
  const alignedFamilies = PROGRAM_ROLE_FAMILY_ALIGNMENT[program.slug] ?? [];
  const blob = [program.title, program.categoryLabel, ...program.skills, program.partner].join(' ').toLowerCase();
  const isolatedTechnicalTerms = new Set(['html', 'css', 'python', 'aws', 'javascript', 'react']);
  let matchedSkillCount = 0;
  let matchedTechnicalIsolatedCount = 0;

  /* Marketing-style postings that mention HTML/CSS are not strong SWE fits, but should not be clamped to 0. */
  if (
    score < 0 &&
    alignedFamilies.includes('software-engineering') &&
    detectedRoleFamily.primary === 'sales-business'
  ) {
    const webMarkupSkill = ['html', 'css'] as const;
    if (webMarkupSkill.some((sk) => skillMatchesText(sk, matchableText))) {
      score += 6;
    }
  }

  for (const t of tokens) {
    if (t.length < 3) continue;
    if (!blob.includes(t)) continue;
    const isIsolatedTechnical = isolatedTechnicalTerms.has(t);
    if (isIsolatedTechnical && detectedRoleFamily.primary && detectedRoleFamily.primary.includes('support')) {
      matchedTechnicalIsolatedCount += 1;
      continue;
    }
    score += 0.5;
  }

  for (const skill of program.skills) {
    if (!skillMatchesText(skill, matchableText)) continue;
    matchedSkillCount += 1;
    const skillNorm = normalizeHaystack(skill).trim();
    const isIsolatedTechnical = isolatedTechnicalTerms.has(skillNorm);
    if (isIsolatedTechnical) matchedTechnicalIsolatedCount += 1;
    score += isIsolatedTechnical ? scoreSkillMatch(skill) : 3;
  }

  const engineeringLikeProgram = alignedFamilies.includes('software-engineering') || alignedFamilies.includes('data-analytics');
  const supportLedRole = detectedRoleFamily.primary === 'customer-support' || detectedRoleFamily.primary === 'it-support';

  if (engineeringLikeProgram && supportLedRole && matchedTechnicalIsolatedCount <= 1 && matchedSkillCount <= 2) {
    score -= 8;
  }

  if (alignedFamilies.includes(detectedRoleFamily.primary) && matchedSkillCount >= 2) {
    score += 2;
  }

  return Math.max(score, 0);
}

function roleFamilyLabel(roleFamily: RoleFamily): string {
  return roleFamily.replace(/-/g, ' ');
}

function scoreSkillMatch(skill: string): number {
  const skillNorm = normalizeHaystack(skill).replace(/\s+/g, ' ').trim();
  return LOW_SIGNAL_SKILL_WEIGHTS[skillNorm] ?? 2;
}

function rationaleFor(program: Program, matchableText: MatchableText, detectedRoleFamily: DetectedRoleFamily): string {
  const hits = program.skills.filter((sk) => skillMatchesText(sk, matchableText));
  const alignedFamilies = PROGRAM_ROLE_FAMILY_ALIGNMENT[program.slug] ?? [];

  if (detectedRoleFamily.primary !== 'general' && alignedFamilies.includes(detectedRoleFamily.primary)) {
    const roleSignal = detectedRoleFamily.titleSignals[0] ?? detectedRoleFamily.supportingSignals[0] ?? roleFamilyLabel(detectedRoleFamily.primary);
    if (hits.length > 0) {
      return `This reads first like a ${roleFamilyLabel(detectedRoleFamily.primary)} role (${roleSignal}), and ${hits
        .slice(0, 2)
        .join(' and ')} reinforce that fit for this program.`;
    }
    return `This reads first like a ${roleFamilyLabel(detectedRoleFamily.primary)} role (${roleSignal}), which lines up with this program.`;
  }

  if (detectedRoleFamily.primary !== 'general') {
    const roleSignal = detectedRoleFamily.titleSignals[0] ?? detectedRoleFamily.supportingSignals[0] ?? roleFamilyLabel(detectedRoleFamily.primary);
    if (hits.length > 0) {
      return `The posting leans ${roleFamilyLabel(detectedRoleFamily.primary)} (${roleSignal}) more than this track, even though it mentions ${hits
        .slice(0, 2)
        .join(' and ')}.`;
    }
    return `The posting leans ${roleFamilyLabel(detectedRoleFamily.primary)} (${roleSignal}), so this track is a secondary match.`;
  }

  if (hits.length > 0) {
    return `Your draft mentions ${hits.slice(0, 2).join(' and ')} — this track covers those skills.`;
  }

  return `Strong fit for ${program.categoryLabel.toLowerCase()} talent we certify in Austin.`;
}

function confidenceFromScore(score: number, maxScore: number): ProgramMatchConfidence {
  if (maxScore <= 0) return 'consider';
  const ratio = score / maxScore;
  if (ratio >= 0.65 && score >= 6) return 'strong';
  if (ratio >= 0.35 && score >= 3) return 'good';
  return 'consider';
}

/**
 * Rank allowed program slugs for an employer job from free-text (title + description + requirements).
 */
export function rankProgramsForEmployerJob(haystack: string, allowedSlugs: string[]): RankedProgramMatch[] {
  const matchableText = buildMatchableText(haystack);
  const tokens = new Set(tokenize(haystack));
  const detectedRoleFamily = detectRoleFamily(haystack, matchableText);

  const rows: { program: Program; score: number }[] = [];
  for (const slug of allowedSlugs) {
    const program = PROGRAMS.find((p) => p.slug === slug);
    if (!program) continue;
    rows.push({ program, score: scoreProgram(program, matchableText, tokens, detectedRoleFamily) });
  }

  rows.sort((a, b) => b.score - a.score);
  const maxScore = rows[0]?.score ?? 0;

  return rows.map((r) => ({
    slug: r.program.slug,
    title: r.program.title,
    score: r.score,
    confidence: confidenceFromScore(r.score, Math.max(maxScore, 1)),
    rationale: rationaleFor(r.program, matchableText, detectedRoleFamily),
  }));
}

export const __rankProgramsForEmployerJob = {
  buildMatchableText,
  classifySkillMatch,
  skillMatchesText,
  detectRoleFamily,
  scoreProgram,
  scoreSkillMatch,
};
