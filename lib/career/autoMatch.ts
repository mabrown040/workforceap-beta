/**
 * Pure scoring helpers for the O*NET → WorkforceAP program auto-match feature.
 *
 * Extracted from `app/api/admin/onet/auto-match/route.ts` so the scoring rules
 * (token tokenization, overlap ratio, recommendationType buckets, top-N cutoff)
 * can be unit tested in isolation without a database or Next request.
 *
 * The scoring stays intentionally simple: whole-word overlap between the
 * occupation's metadata tokens and each program's keyword tokens. Anything more
 * elaborate (semantic embeddings, weighted skills) belongs in a separate
 * scorer — keep this one transparent for compliance/audit conversations.
 */

import type { Program } from '@/lib/content/programs';

/** Minimal, non-DB shape of an O*NET occupation needed for scoring. */
export type OccupationForMatch = {
  title: string;
  description?: string | null;
  jobFamily?: string | null;
  outlookSummary?: string | null;
  skills: { skillName: string }[];
  tasks: { taskText: string }[];
  technologies?: { technologyName: string }[];
};

export type AutoMatchResult = {
  programSlug: string;
  programTitle: string;
  /** Overlap ratio in [0, 1], rounded to 3 decimal places. */
  score: number;
  reason: string;
  recommendationType: 'primary' | 'bridge' | 'stretch';
  experienceBand: 'beginner' | 'some_experience' | 'experienced';
};

/** Tokens shorter than this are dropped (matches the original route behavior).
 *  Reduced from 4 to 2 so critical abbreviations like IT, AI, SQL, AWS, OS,
 *  UX, EHR, CPT, CLT, OSHA are preserved for matching. */
const MIN_TOKEN_LENGTH = 2;

/** Synonym groups — terms in the same group are treated as equivalent matches.
 *  Bridges the vocabulary gap between O*NET occupational language and
 *  WorkforceAP program/certification language. */
const DOMAIN_SYNONYMS: string[][] = [
  // IT / Networking / Cybersecurity
  ['computer', 'computing', 'information', 'technology', 'technical', 'tech', 'it'],
  ['network', 'networking', 'networks', 'lan', 'wan', 'tcp', 'cisco', 'wireless', 'infrastructure'],
  ['security', 'cybersecurity', 'cyber', 'risk', 'cryptography', 'protection', 'defense'],
  ['support', 'helpdesk', 'help', 'desk', 'troubleshoot', 'troubleshooting', 'service', 'services'],
  ['hardware', 'software', 'systems', 'system', 'operating'],
  ['database', 'databases', 'sql', 'mysql', 'postgresql', 'data'],
  ['cloud', 'aws', 'azure', 'gcp', 'amazon', 'serverless', 'devops', 'containers'],
  ['programming', 'development', 'developer', 'software', 'coding', 'code', 'engineering', 'engineer'],
  ['python', 'javascript', 'java', 'csharp', 'ruby', 'php', 'golang'],
  ['web', 'website', 'frontend', 'backend', 'fullstack', 'react', 'angular', 'vue', 'node'],
  ['ai', 'artificial', 'intelligence', 'machine', 'learning', 'ml', 'deep', 'neural', 'nlp'],
  ['data', 'analytics', 'analyst', 'analysis', 'visualization', 'tableau', 'powerbi', 'bi'],
  ['testing', 'qa', 'quality', 'assurance', 'validation'],

  // Healthcare / HIT
  ['medical', 'healthcare', 'health', 'clinical', 'patient', 'hospital'],
  ['billing', 'coding', 'coder', 'icd', 'cpt', 'hcpcs', 'revenue'],
  ['ehr', 'emr', 'electronic', 'record', 'records', 'health', 'information'],
  ['hipaa', 'compliance', 'privacy', 'security'],

  // Business / Project Management
  ['project', 'program', 'portfolio', 'management', 'manager', 'pm'],
  ['agile', 'scrum', 'kanban', 'sprint', 'waterfall', 'lean'],
  ['business', 'operations', 'operational', 'process', 'workflow'],
  ['marketing', 'digital', 'seo', 'sem', 'social', 'content', 'email'],
  ['sales', 'selling', 'customer', 'client', 'account'],

  // Manufacturing / Construction / Logistics
  ['manufacturing', 'production', 'fabrication', 'assembly', 'machining'],
  ['logistics', 'supply', 'chain', 'warehouse', 'inventory', 'transportation', 'distribution'],
  ['construction', 'building', 'carpentry', 'masonry', 'electrical', 'plumbing'],
  ['safety', 'osha', 'compliance', 'inspection', 'hazard'],
  ['quality', 'control', 'inspection', 'assurance', 'sixsigma'],

  // Digital literacy / General office
  ['digital', 'literacy', 'computer', 'basic', 'fundamentals', 'foundations'],
  ['office', 'administrative', 'clerical', 'secretary', 'assistant'],
  ['excel', 'spreadsheet', 'word', 'powerpoint', 'microsoft', 'google', 'suite'],
];

/** Build a bidirectional synonym lookup: token -> Set of equivalent tokens. */
function buildSynonymMap(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const group of DOMAIN_SYNONYMS) {
    const normalized = group.map((t) => t.toLowerCase());
    const set = new Set(normalized);
    for (const token of normalized) {
      const existing = map.get(token);
      if (existing) {
        for (const s of set) existing.add(s);
      } else {
        map.set(token, new Set(set));
      }
    }
  }
  return map;
}
const SYNONYM_MAP = buildSynonymMap();

/** Common English stop words that should never count as matching tokens,
 *  even when they meet MIN_TOKEN_LENGTH. Keeps short abbreviations like IT,
 *  AI, OS, UX, SQL, AWS while filtering out noise. */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
  'boy', 'did', 'she', 'use', 'her', 'than', 'them', 'well', 'were',
  'been', 'have', 'said', 'each', 'which', 'their', 'time', 'will',
  'about', 'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so',
  'some', 'her', 'would', 'make', 'like', 'into', 'him', 'has', 'two',
  'more', 'very', 'what', 'know', 'just', 'first', 'also', 'after',
  'back', 'other', 'many', 'than', 'only', 'those', 'come', 'day',
  'most', 'us', 'is', 'it', 'an', 'as', 'at', 'be', 'by', 'do', 'go',
  'he', 'me', 'my', 'no', 'of', 'on', 'or', 'to', 'we',
]);

/** Tokenize free text into a lowercased whole-word set, dropping short tokens
 *  and common stop words. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(w));
}

/** Expand a token set with all synonyms so domain-equivalent terms match. */
function expandWithSynonyms(tokens: Set<string>): Set<string> {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const syns = SYNONYM_MAP.get(token);
    if (syns) {
      for (const s of syns) expanded.add(s);
    }
  }
  return expanded;
}

/** Build the occupation token set used for overlap scoring.
 *  Title tokens are weighted 3× (added twice) because the occupation title
 *  is the strongest signal, especially when skills/tasks/tech are empty. */
export function buildOccupationTokens(occ: OccupationForMatch): Set<string> {
  const titleTokens = tokenize(occ.title);
  const blob = [
    // Title weighted 3×
    ...titleTokens,
    ...titleTokens,
    occ.description ?? '',
    occ.jobFamily ?? '',
    occ.outlookSummary ?? '',
    occ.skills.map((s) => s.skillName).join(' '),
    occ.tasks.map((t) => t.taskText).join(' '),
    occ.technologies?.map((t) => t.technologyName).join(' ') ?? '',
  ].join(' ');
  const raw = new Set(tokenize(blob));
  return expandWithSynonyms(raw);
}

/** Build the deduped keyword list for a program, including course names. */
export function buildProgramKeywords(prog: Program): string[] {
  const raw = [
    prog.title,
    prog.category,
    prog.categoryLabel,
    ...prog.skills,
    prog.partner,
    ...prog.courses.map((c) => c.name),
  ].join(' ');
  const tokens = [...new Set(tokenize(raw))];
  return tokens;
}

/** Build program tokens with synonym expansion. */
function buildProgramTokens(prog: Program): Set<string> {
  return expandWithSynonyms(new Set(buildProgramKeywords(prog)));
}

/**
 * Check whether two tokens are similar enough to count as a partial match.
 * Handles common stem variations: network ↔ networking, troubleshoot ↔ troubleshooting,
 * security ↔ cybersecurity, etc.
 */
function isPartialMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 2 || b.length < 2) return false;
  // One is a prefix of the other (network / networking)
  if (a.startsWith(b) || b.startsWith(a)) return true;
  // One contains the other as a whole word segment
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

/** Count exact and partial keyword matches against an occupation token set. */
function countMatches(
  keywords: string[],
  occTokens: Set<string>
): { exact: number; partial: number; matchedTerms: string[] } {
  const exactTerms: string[] = [];
  const partialTerms: string[] = [];

  for (const kw of keywords) {
    // Direct match or synonym match
    if (occTokens.has(kw)) {
      exactTerms.push(kw);
      continue;
    }

    // Partial / stem match
    let foundPartial = false;
    for (const token of occTokens) {
      if (isPartialMatch(token, kw)) {
        foundPartial = true;
        break;
      }
    }
    if (foundPartial) {
      partialTerms.push(kw);
    }
  }

  return {
    exact: exactTerms.length,
    partial: partialTerms.length,
    matchedTerms: [...exactTerms, ...partialTerms],
  };
}

/**
 * Category/domain bridge: if the occupation clearly belongs to a domain
 * (IT, healthcare, business, manufacturing, construction, logistics),
 * programs in the matching category get a baseline score even if token
 * overlap is weak. This prevents "Computer Network Support Specialists"
 * from scoring 0 against IT Support because the vocabularies differ.
 */
const DOMAIN_PATTERNS: Array<{ name: string; occRegex: RegExp; programCategories: Set<string> }> = [
  {
    name: 'IT & Cybersecurity',
    occRegex: /\b(computer|information|technology|network|cyber|security|software|hardware|systems|technical|support|helpdesk|database|cloud|programming|developer|web|data|analytics|ai|artificial|intelligence|machine|learning)\b/i,
    programCategories: new Set(['it-cyber', 'ai-software', 'cloud-data']),
  },
  {
    name: 'Healthcare',
    occRegex: /\b(medical|health|healthcare|clinical|patient|hospital|billing|coding|ehr|emr|hipaa|pharmacy|nursing|caregiver)\b/i,
    programCategories: new Set(['healthcare']),
  },
  {
    name: 'Business & Project Management',
    occRegex: /\b(business|project|management|manager|marketing|sales|finance|accounting|administrative|office|customer|client|account|hr|human|resources)\b/i,
    programCategories: new Set(['business']),
  },
  {
    name: 'Manufacturing & Logistics',
    occRegex: /\b(manufacturing|production|logistics|supply|chain|warehouse|inventory|transportation|distribution|machining|assembly|fabrication|quality|control|sixsigma)\b/i,
    programCategories: new Set(['manufacturing']),
  },
  {
    name: 'Construction & Trades',
    occRegex: /\b(construction|building|carpentry|masonry|electrical|plumbing|hvac|welding|safety|osha|blueprint|trades|laborer)\b/i,
    programCategories: new Set(['manufacturing']),
  },
];

function detectDomain(occ: OccupationForMatch): string | null {
  const text = `${occ.title} ${occ.description ?? ''}`.toLowerCase();
  for (const domain of DOMAIN_PATTERNS) {
    if (domain.occRegex.test(text)) return domain.name;
  }
  return null;
}

/**
 * Convert a raw overlap score into a recommendation tier.
 * Boundaries match the original API route so scoring is consistent.
 */
export function scoreToRecommendationType(score: number): AutoMatchResult['recommendationType'] {
  if (score >= 0.25) return 'primary';
  if (score >= 0.1) return 'bridge';
  return 'stretch';
}

/** Infer an experience band from the occupation title and description tokens. */
export function inferExperienceBand(occ: OccupationForMatch): AutoMatchResult['experienceBand'] {
  const text = [occ.title, occ.description ?? ''].join(' ').toLowerCase();
  if (/\b(entry[- ]?level|junior|trainee|assistant|intern|beginner)\b/.test(text)) return 'beginner';
  if (/\b(senior|lead|principal|manager|director|expert|specialist)\b/.test(text)) return 'experienced';
  return 'some_experience';
}

/** Score a single program against an occupation token set.
 *  Includes domain/category bridging and course-name matching. */
export function scoreProgram(prog: Program, occTokens: Set<string>, occ: OccupationForMatch): AutoMatchResult {
  const keywords = buildProgramKeywords(prog);
  const progTokens = buildProgramTokens(prog);

  const { exact, partial, matchedTerms } = countMatches(keywords, occTokens);

  // Base keyword overlap score
  const rawScore = keywords.length > 0 ? (exact + partial * 0.5) / keywords.length : 0;

  // Domain bridge bonus: if occupation and program share a domain,
  // add a baseline score so vocabulary gaps don't zero out matches.
  let domainBonus = 0;
  const detectedDomain = detectDomain(occ);
  if (detectedDomain) {
    for (const domain of DOMAIN_PATTERNS) {
      if (domain.name === detectedDomain && domain.programCategories.has(prog.category)) {
        // Small but meaningful bonus — enough to push into bridge territory
        domainBonus = 0.06;
        break;
      }
    }
  }

  const score = Math.min(1, Math.round((rawScore + domainBonus) * 1000) / 1000);
  const recommendationType = scoreToRecommendationType(score);
  const experienceBand = occ ? inferExperienceBand(occ) : 'beginner';

  const matchedDisplay = matchedTerms.slice(0, 5);
  let reason: string;
  if (exact > 0 && partial > 0) {
    reason = `Shares ${exact} exact keyword${exact !== 1 ? 's' : ''} and ${partial} related term${partial !== 1 ? 's' : ''}${matchedDisplay.length ? ` including ${matchedDisplay.join(', ')}` : ''}.`;
  } else if (exact > 0) {
    reason = `Shares ${exact} keyword${exact !== 1 ? 's' : ''}${matchedDisplay.length ? ` including ${matchedDisplay.join(', ')}` : ''}.`;
  } else if (partial > 0) {
    reason = `Partial overlap on ${partial} related term${partial !== 1 ? 's' : ''}${matchedDisplay.length ? ` including ${matchedDisplay.join(', ')}` : ''}.`;
  } else if (domainBonus > 0) {
    reason = `Aligned ${detectedDomain} domain — recommended as a career pathway match.`;
  } else {
    reason = 'Low keyword overlap — stretch recommendation based on adjacent career pathway.';
  }

  return {
    programSlug: prog.slug,
    programTitle: prog.title,
    score,
    reason,
    recommendationType,
    experienceBand,
  };
}

/** Lower bound — programs scoring below this are dropped from the top-N list. */
export const MIN_INCLUDED_SCORE = 0.04;
/** Maximum number of matches returned to the admin UI. */
export const TOP_N = 8;

/**
 * Fallback title-only matcher when the full occupation record yields no results.
 * Compares occupation title tokens against program title + skills + courses for quick matches.
 * Fixed scoring: divides by occupation title tokens (not program tokens) so the score
 * reflects how much of the occupation vocabulary the program covers.
 */
function rankProgramsByTitle(
  occ: OccupationForMatch,
  programs: ReadonlyArray<Program>
): AutoMatchResult[] {
  const titleTokens = expandWithSynonyms(new Set(tokenize(occ.title)));
  if (titleTokens.size === 0) return [];

  return programs
    .map((p) => {
      const progTokens = buildProgramTokens(p);

      let exact = 0;
      let partial = 0;
      const matched: string[] = [];

      for (const token of titleTokens) {
        let hit = false;
        for (const pt of progTokens) {
          if (pt === token) {
            exact++;
            hit = true;
            break;
          }
          if (isPartialMatch(pt, token)) {
            partial++;
            hit = true;
            break;
          }
        }
        if (hit) matched.push(token);
      }

      // Score: matched tokens / occupation title tokens (how much of the
      // occupation does this program cover?)
      const score = Math.min(1, Math.round(((exact + partial * 0.5) / titleTokens.size) * 1000) / 1000);
      const matchedDisplay = matched.slice(0, 5);

      let reason: string;
      if (exact + partial > 0) {
        reason = `Title match: shares ${exact + partial} term${exact + partial !== 1 ? 's' : ''}${matchedDisplay.length ? ` including ${matchedDisplay.join(', ')}` : ''}.`;
      } else {
        // Domain bridge may still apply even with zero token overlap
        const detectedDomain = detectDomain(occ);
        let domainBonus = 0;
        if (detectedDomain) {
          for (const domain of DOMAIN_PATTERNS) {
            if (domain.name === detectedDomain && domain.programCategories.has(p.category)) {
              domainBonus = 0.06;
              break;
            }
          }
        }
        if (domainBonus > 0) {
          reason = `Aligned ${detectedDomain} domain — career pathway recommendation.`;
        } else {
          reason = 'Low title overlap — stretch recommendation.';
        }
      }

      return {
        programSlug: p.slug,
        programTitle: p.title,
        score: Math.max(score, 0),
        reason,
        recommendationType: scoreToRecommendationType(Math.max(score, 0)),
        experienceBand: inferExperienceBand(occ),
      };
    })
    .filter((m) => m.score >= MIN_INCLUDED_SCORE || (m.reason.includes('domain') && m.score > 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);
}

/** Run the full auto-match pipeline for an occupation against a program list. */
export function rankPrograms(
  occ: OccupationForMatch,
  programs: ReadonlyArray<Program>
): AutoMatchResult[] {
  const occTokens = buildOccupationTokens(occ);
  const ranked = programs
    .map((p) => scoreProgram(p, occTokens, occ))
    .filter((m) => m.score >= MIN_INCLUDED_SCORE || (m.reason.includes('domain') && m.score > 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);

  // If full-data scoring yields nothing useful, fall back to title-only matching.
  if (ranked.length === 0) {
    return rankProgramsByTitle(occ, programs);
  }

  return ranked;
}

/** Alias for `rankPrograms` used by the AI career mapping engine. */
export const autoMatchOccupationToPrograms = rankPrograms;
