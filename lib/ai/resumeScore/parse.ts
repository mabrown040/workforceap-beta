import { ACTION_VERBS } from './actionVerbs';
import type { ResumeBullet, ResumeFeatures, ResumeSection } from './types';

const BULLET_PREFIX = /^\s*([•▪◦●○\-*●▶►–—]|\d+[.)])\s+/;

const SECTION_HEADERS: Array<{ patterns: RegExp[]; normalized: ResumeSection['normalized'] }> = [
  { patterns: [/^contact\s*(information)?$/i, /^personal\s*info/i], normalized: 'contact' },
  { patterns: [/^(professional\s+)?summary$/i, /^profile$/i, /^objective$/i, /^about(\s+me)?$/i], normalized: 'summary' },
  { patterns: [/^(professional\s+|work\s+)?experience$/i, /^employment(\s+history)?$/i, /^(work\s+)?history$/i, /^career(\s+history)?$/i, /^additional\s+experience$/i], normalized: 'experience' },
  { patterns: [/^education(\s+and\s+training)?$/i, /^academic(\s+background)?$/i], normalized: 'education' },
  { patterns: [/^(technical\s+|core\s+)?skills(\s+and\s+abilities)?$/i, /^competencies$/i, /^expertise$/i], normalized: 'skills' },
  { patterns: [/^certifications?$/i, /^licenses?\s*(and\s*certifications?)?$/i, /^credentials$/i], normalized: 'certifications' },
  { patterns: [/^projects$/i, /^selected\s+projects$/i, /^side\s+projects$/i], normalized: 'projects' },
];

const METRIC_PATTERNS: RegExp[] = [
  /\$\s?\d/, // $5M, $1.2K
  /\d+\s*%/, // 25%
  /\d+\s*(million|billion|thousand|m\b|k\b|b\b)/i,
  /\d+\s*\+/, // 40+
  /\b\d{2,}\b/, // any 2+ digit number (count, year, hours, members)
  /\bx\d+/i, // x10
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const LINKEDIN_RE = /(linkedin\.com\/in\/[a-z0-9-]+)/i;
const CITY_STATE_RE = /\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)\s*,\s*([A-Z]{2})\b/;

const DATE_RANGE_RE = /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z.]*\s+\d{4}|\d{4})\s*[–—\-]+\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z.]*\s+\d{4}|\d{4}|Present|Current)/i;

function normalizeLines(raw: string): string[] {
  return raw.replace(/\r/g, '').split('\n').map((l) => l.trimEnd());
}

function looksLikeHeader(line: string): { match: ResumeSection['normalized']; name: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return null;
  if (BULLET_PREFIX.test(line)) return null;
  for (const entry of SECTION_HEADERS) {
    for (const pat of entry.patterns) {
      if (pat.test(trimmed)) return { match: entry.normalized, name: trimmed };
    }
  }
  return null;
}

function isBulletLine(line: string): boolean {
  return BULLET_PREFIX.test(line);
}

function stripBulletPrefix(line: string): string {
  return line.replace(BULLET_PREFIX, '').trim();
}

function hasMetric(text: string): boolean {
  return METRIC_PATTERNS.some((re) => re.test(text));
}

function firstToken(text: string): string {
  const m = /^[A-Za-z][A-Za-z\-]*/.exec(text.trim());
  return m ? m[0].toLowerCase() : '';
}

function detectSections(lines: string[]): ResumeSection[] {
  const headers: Array<{ name: string; normalized: ResumeSection['normalized']; line: number }> = [];
  lines.forEach((line, idx) => {
    const m = looksLikeHeader(line);
    if (m) headers.push({ name: m.name, normalized: m.match, line: idx });
  });
  return headers.map((h, i) => ({
    name: h.name,
    normalized: h.normalized,
    startLine: h.line,
    endLine: i + 1 < headers.length ? headers[i + 1].line - 1 : lines.length - 1,
  }));
}

function sectionForLine(line: number, sections: ResumeSection[]): string | null {
  for (const s of sections) {
    if (line >= s.startLine && line <= s.endLine) return s.normalized;
  }
  return null;
}

function extractBullets(lines: string[], sections: ResumeSection[]): ResumeBullet[] {
  // A "bullet" is an achievement line under Experience or Projects only.
  // Excludes:
  //   - section headers
  //   - role/company/date header lines (pipe-separated or containing date range w/ few words)
  //   - summary paragraph (free-form prose, not bullets)
  const bullets: ResumeBullet[] = [];
  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    if (looksLikeHeader(line)) return;
    const section = sectionForLine(idx, sections);
    if (section !== 'experience' && section !== 'projects') return;

    const text = isBulletLine(line) ? stripBulletPrefix(line) : line.trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words < 4) return;
    // Drop role/company/date headers
    if (DATE_RANGE_RE.test(text)) return;
    // Drop lines with multiple pipes — typically "Title | Company | Location"
    const pipeCount = (text.match(/\|/g) || []).length;
    if (pipeCount >= 2 && words < 18) return;

    const fw = firstToken(text);
    bullets.push({
      text,
      line: idx + 1,
      section,
      words,
      firstWord: fw,
      hasMetric: hasMetric(text),
      startsWithActionVerb: ACTION_VERBS.has(fw),
    });
  });
  return bullets;
}

function extractContact(rawText: string): ResumeFeatures['contact'] {
  const top = rawText.split('\n').slice(0, 12).join('\n');
  const email = top.match(EMAIL_RE)?.[0] ?? rawText.match(EMAIL_RE)?.[0] ?? null;
  const phone = top.match(PHONE_RE)?.[0] ?? rawText.match(PHONE_RE)?.[0] ?? null;
  const linkedinUrl = rawText.match(LINKEDIN_RE)?.[0] ?? null;
  const cityState = top.match(CITY_STATE_RE)?.[0] ?? null;
  return { email, phone, linkedinUrl, cityState };
}

function extractDateRanges(rawText: string): ResumeFeatures['dateRanges'] {
  const out: ResumeFeatures['dateRanges'] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(DATE_RANGE_RE.source, 'gi');
  while ((m = re.exec(rawText)) !== null) {
    const to = m[2];
    out.push({
      from: m[1],
      to,
      current: /present|current/i.test(to),
    });
  }
  return out;
}

export function parseResume(rawText: string): ResumeFeatures {
  let lines = normalizeLines(rawText);
  let sections = detectSections(lines);
  let reflowed = false;

  // Recovery pass: PDF copy/paste and some uploads collapse the resume into
  // one paragraph with no newlines. A line-based parse then finds no sections
  // and no bullets, scoring a real resume near zero. Re-flow the text around
  // inline section headers / bullet glyphs / sentence boundaries and re-parse;
  // keep the result only if it actually recovers structure.
  if (sections.length === 0 && rawText.trim().length > 200) {
    const reflowedLines = normalizeLines(reflowFlatText(rawText));
    const reflowedSections = detectSections(reflowedLines);
    if (reflowedSections.length >= 2) {
      lines = reflowedLines;
      sections = reflowedSections;
      reflowed = true;
    }
  }

  const bullets = extractBullets(lines, sections);
  const contact = extractContact(rawText);
  const dateRanges = extractDateRanges(rawText);
  return { rawText, lines, sections, bullets, contact, dateRanges, reflowed };
}

/** Title-case header phrases we can safely split on inside flat text (longest first). */
const INLINE_HEADER_PHRASES = [
  'Contact Information',
  'Professional Summary',
  'Professional Experience',
  'Work Experience',
  'Employment History',
  'Work History',
  'Career History',
  'Technical Skills',
  'Core Skills',
  'Skills and Abilities',
  'Education and Training',
  'Licenses and Certifications',
  'Selected Projects',
  'Certifications',
  'Competencies',
  'Experience',
  'Education',
  'Summary',
  'Skills',
  'Projects',
  'Objective',
];

const INLINE_HEADER_RE = new RegExp(`(?:^|\\s)(${INLINE_HEADER_PHRASES.join('|')})(?=\\s|$)`, 'g');

function reflowFlatText(rawText: string): string {
  return (
    rawText
      // Bullet glyphs embedded mid-text start a new line.
      .replace(/\s*([•▪◦●○▶►])\s*/g, '\n$1 ')
      // Known section headers become their own line.
      .replace(INLINE_HEADER_RE, '\n$1\n')
      // Sentence boundaries approximate bullet boundaries within sections.
      .replace(/\.\s+(?=[A-Z])/g, '.\n')
  );
}
