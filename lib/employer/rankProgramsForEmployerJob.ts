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

type MatchableText = {
  haystackNorm: string;
  tokenSet: Set<string>;
};

type RoleContext = {
  isSupportRole: boolean;
  isSoftwareRole: boolean;
  isDataRole: boolean;
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
      return false;
    case 'token':
      return matchableText.tokenSet.has(skillNorm);
    case 'phrase':
      return hasPhraseBoundaryMatch(matchableText.haystackNorm, skillNorm);
    default:
      return false;
  }
}


function buildRoleContext(matchableText: MatchableText): RoleContext {
  const haystack = matchableText.haystackNorm;
  return {
    isSupportRole: /(customer\s+(?:success|support|service)|help\s*desk|technical\s+support|support\s+representative|book\s+of\s+business|onboarding|ticket|zendesk|knowledge\s+base|qbr|renewal)/.test(haystack),
    isSoftwareRole: /(software\s+engineer|software\s+developer|full\s*stack|frontend|backend|react|node(?:\.js)?|typescript|javascript|api|pull\s+request|distributed\s+systems)/.test(haystack),
    isDataRole: /(data\s+analyst|analytics|dashboard|sql|tableau|spreadsheet|excel|data\s+visualization|statistical\s+analysis|experimentation)/.test(haystack),
  };
}

function skillWeight(skill: string, program: Program, context: RoleContext): number {
  const skillNorm = normalizeHaystack(skill).replace(/\s+/g, ' ').trim();

  if (context.isSupportRole && !context.isSoftwareRole && program.category === 'ai-software') {
    if (/^(html|css|javascript)$/.test(skillNorm)) return 0.25;
  }

  if (context.isSupportRole && !context.isDataRole && program.category === 'cloud-data') {
    if (/^(sql|r|tableau|data viz|spreadsheets)$/.test(skillNorm)) return 0.25;
  }

  return 2;
}

function contextualScoreAdjustment(program: Program, context: RoleContext): number {
  let adjustment = 0;

  if (context.isSupportRole) {
    if (program.title.toLowerCase().includes('support')) adjustment += 4;
    if (program.slug === 'comptia-a-professional-certificate') adjustment += 2;
    if (!context.isSoftwareRole && program.category === 'ai-software') adjustment -= 2;
    if (!context.isDataRole && program.category === 'cloud-data') adjustment -= 1;
  }

  if (context.isSoftwareRole) {
    if (program.category === 'ai-software') adjustment += 3;
    if (program.title.toLowerCase().includes('support')) adjustment -= 1;
  }

  if (context.isDataRole) {
    if (program.category === 'cloud-data') adjustment += 3;
    if (program.category === 'ai-software') adjustment -= 1;
  }

  return adjustment;
}

function scoreProgram(program: Program, matchableText: MatchableText, tokens: Set<string>, context: RoleContext): number {
  let score = 0;
  const blob = [program.title, program.categoryLabel, ...program.skills, program.partner].join(' ').toLowerCase();

  for (const t of tokens) {
    if (t.length < 3) continue;
    if (blob.includes(t)) score += 1;
  }
  for (const skill of program.skills) {
    if (skillMatchesText(skill, matchableText)) score += skillWeight(skill, program, context);
  }

  return score + contextualScoreAdjustment(program, context);
}

function rationaleFor(program: Program, matchableText: MatchableText): string {
  const hits = program.skills.filter((sk) => skillMatchesText(sk, matchableText));
  if (hits.length > 0) {
    return `Your draft mentions ${hits.slice(0, 2).join(' and ')} — this track covers those skills.`;
  }
  if (/cloud|aws|azure|devops/.test(matchableText.haystackNorm) && program.category === 'cloud-data') {
    return 'Cloud and data language in your posting lines up with this track.';
  }
  if (/(cyber|security|soc|compliance)/.test(matchableText.haystackNorm) && program.slug.includes('cyber')) {
    return 'Security-focused wording fits candidates coming out of this program.';
  }
  if (/(help\s*desk|support|desktop|hardware)/.test(matchableText.haystackNorm) && program.title.toLowerCase().includes('support')) {
    return 'Support-style roles map well to this entry IT path.';
  }
  if (/(data\s*analyst|sql|tableau|spreadsheet)/.test(matchableText.haystackNorm) && program.title.toLowerCase().includes('data')) {
    return 'Analytics language in the posting matches this data pathway.';
  }
  if (/(software|developer|engineer|react|python|full[\s-]?stack)/.test(matchableText.haystackNorm) && program.category === 'ai-software') {
    return 'Engineering-style roles align with software / AI developer training.';
  }
  if (/(nurse|medical|health|hipaa|coding|icd)/.test(matchableText.haystackNorm) && program.category === 'healthcare') {
    return 'Healthcare admin and coding tracks match this kind of hire.';
  }
  if (/(warehouse|manufacturing|forklift|construction|osha)/.test(matchableText.haystackNorm) && program.category === 'manufacturing') {
    return 'Hands-on operations roles pair with trades and manufacturing programs.';
  }
  if (/(project|scrum|agile|pm\b)/.test(matchableText.haystackNorm) && program.title.toLowerCase().includes('project')) {
    return 'Coordination and delivery language fits project management training.';
  }
  return `Strong fit for ${program.categoryLabel.toLowerCase()} talent we certify in Austin.`;
}

function confidenceFromScore(score: number, maxScore: number): ProgramMatchConfidence {
  if (maxScore <= 0) return 'consider';
  const ratio = score / maxScore;
  if (ratio >= 0.65 && score >= 3) return 'strong';
  if (ratio >= 0.35 && score >= 2) return 'good';
  return 'consider';
}

/**
 * Rank allowed program slugs for an employer job from free-text (title + description + requirements).
 */
export function rankProgramsForEmployerJob(haystack: string, allowedSlugs: string[]): RankedProgramMatch[] {
  const matchableText = buildMatchableText(haystack);
  const tokens = new Set(tokenize(haystack));
  const context = buildRoleContext(matchableText);

  const rows: { program: Program; score: number }[] = [];
  for (const slug of allowedSlugs) {
    const program = PROGRAMS.find((p) => p.slug === slug);
    if (!program) continue;
    rows.push({ program, score: scoreProgram(program, matchableText, tokens, context) });
  }

  rows.sort((a, b) => b.score - a.score);
  const maxScore = rows[0]?.score ?? 0;

  return rows.map((r) => ({
    slug: r.program.slug,
    title: r.program.title,
    score: r.score,
    confidence: confidenceFromScore(r.score, Math.max(maxScore, 1)),
    rationale: rationaleFor(r.program, matchableText),
  }));
}

export const __rankProgramsForEmployerJob = {
  buildMatchableText,
  classifySkillMatch,
  skillMatchesText,
};
