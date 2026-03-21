import { PROGRAMS, type Program } from '@/lib/content/programs';

export type ProgramMatchConfidence = 'strong' | 'good' | 'consider';

export type RankedProgramMatch = {
  slug: string;
  title: string;
  score: number;
  confidence: ProgramMatchConfidence;
  rationale: string;
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

function scoreProgram(program: Program, haystackNorm: string, tokens: Set<string>): number {
  let score = 0;
  const blob = [program.title, program.categoryLabel, ...program.skills, program.partner].join(' ').toLowerCase();

  for (const t of tokens) {
    if (t.length < 3) continue;
    if (blob.includes(t)) score += 1;
  }
  for (const skill of program.skills) {
    const sk = skill.toLowerCase();
    if (haystackNorm.includes(sk)) score += 2;
  }
  return score;
}

function rationaleFor(program: Program, haystackNorm: string): string {
  const hits = program.skills.filter((sk) => haystackNorm.includes(sk.toLowerCase()));
  if (hits.length > 0) {
    return `Your draft mentions ${hits.slice(0, 2).join(' and ')} — this track covers those skills.`;
  }
  if (/cloud|aws|azure|devops/.test(haystackNorm) && program.category === 'cloud-data') {
    return 'Cloud and data language in your posting lines up with this track.';
  }
  if (/(cyber|security|soc|compliance)/.test(haystackNorm) && program.slug.includes('cyber')) {
    return 'Security-focused wording fits candidates coming out of this program.';
  }
  if (/(help\s*desk|support|desktop|hardware)/.test(haystackNorm) && program.title.toLowerCase().includes('support')) {
    return 'Support-style roles map well to this entry IT path.';
  }
  if (/(data\s*analyst|sql|tableau|spreadsheet)/.test(haystackNorm) && program.title.toLowerCase().includes('data')) {
    return 'Analytics language in the posting matches this data pathway.';
  }
  if (/(software|developer|engineer|react|python|full[\s-]?stack)/.test(haystackNorm) && program.category === 'ai-software') {
    return 'Engineering-style roles align with software / AI developer training.';
  }
  if (/(nurse|medical|health|hipaa|coding|icd)/.test(haystackNorm) && program.category === 'healthcare') {
    return 'Healthcare admin and coding tracks match this kind of hire.';
  }
  if (/(warehouse|manufacturing|forklift|construction|osha)/.test(haystackNorm) && program.category === 'manufacturing') {
    return 'Hands-on operations roles pair with trades and manufacturing programs.';
  }
  if (/(project|scrum|agile|pm\b)/.test(haystackNorm) && program.title.toLowerCase().includes('project')) {
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
  const haystackNorm = normalizeHaystack(haystack);
  const tokens = new Set(tokenize(haystack));

  const rows: { program: Program; score: number }[] = [];
  for (const slug of allowedSlugs) {
    const program = PROGRAMS.find((p) => p.slug === slug);
    if (!program) continue;
    rows.push({ program, score: scoreProgram(program, haystackNorm, tokens) });
  }

  rows.sort((a, b) => b.score - a.score);
  const maxScore = rows[0]?.score ?? 0;

  return rows.map((r) => ({
    slug: r.program.slug,
    title: r.program.title,
    score: r.score,
    confidence: confidenceFromScore(r.score, Math.max(maxScore, 1)),
    rationale: rationaleFor(r.program, haystackNorm),
  }));
}
