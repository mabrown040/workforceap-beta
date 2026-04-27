/**
 * Cleanup utilities for AI-generated text before it hits the UI.
 *
 * Closes audit #119 (typos in elevator pitch), #121 (raw markdown rendered
 * as plain text in resume rewriter), and #132 (smart quotes embedded in
 * spoken-aloud copy).
 *
 * Use cleanSpokenLine for short single-sentence outputs that a member will
 * read aloud (elevator pitch, voice rehearsals). Use stripMarkdownHeading
 * for long-form outputs that we render as plain text but the model emits
 * with `## HEADING` markers.
 */

const COMMON_TYPOS: Array<[RegExp, string]> = [
  /* AI completions periodically drop a letter on doubled-consonant gerunds. */
  [/\bexceling\b/g, 'excelling'],
  [/\bExceling\b/g, 'Excelling'],
  [/\btraveling\b/g, 'traveling'], /* US spelling, no-op — placeholder so we can flip locale later */
];

const SMART_QUOTES: Array<[RegExp, string]> = [
  [/[“”]/g, '"'],
  [/[‘’]/g, "'"],
];

/**
 * Trim wrapping quotes from a line. Models often produce `"I am..."` for
 * elevator pitches; the wrapping quotes get read aloud verbatim.
 */
export function stripWrappingQuotes(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length < 2) return trimmed;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  const isMatchingPair =
    (first === '"' && last === '"') ||
    (first === "'" && last === "'") ||
    (first === '“' && last === '”') ||
    (first === '‘' && last === '’');
  if (!isMatchingPair) return trimmed;
  return trimmed.slice(1, -1).trim();
}

/** Replace smart quotes with plain ASCII so the rendered text matches what's sent to TTS. */
export function normalizeSmartQuotes(text: string): string {
  let out = text;
  for (const [pattern, replacement] of SMART_QUOTES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Fix the small set of high-frequency AI-output typos we keep seeing. */
export function fixCommonTypos(text: string): string {
  let out = text;
  for (const [pattern, replacement] of COMMON_TYPOS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Strip markdown heading markers (`## Heading`) and bold/italic markers
 * for surfaces that render the raw string as plain text. Keep the heading
 * text itself.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '') /* heading markers */
    .replace(/\*\*(.+?)\*\*/g, '$1') /* bold */
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1') /* italic */
    .replace(/`([^`]+)`/g, '$1'); /* inline code */
}

/**
 * Default pipeline for short spoken-aloud outputs (elevator pitch, intros).
 * Order matters: typo fix first, then quote normalization, then strip
 * wrapping quotes.
 */
export function cleanSpokenLine(text: string): string {
  return stripWrappingQuotes(normalizeSmartQuotes(fixCommonTypos(text)));
}

/**
 * Default pipeline for long-form text outputs (resume rewriter, cover
 * letters) that we render as plain-text rather than rendered markdown.
 */
export function cleanLongFormPlainText(text: string): string {
  return stripMarkdown(fixCommonTypos(text)).trim();
}
