/**
 * Plain-text preview for AI snippets and form prefills — removes common markdown
 * tokens so users never see raw ### or ** in UI.
 */
export function stripMarkdownForPreview(input: string, maxLen = 280): string {
  if (!input || typeof input !== 'string') return '';
  let s = input
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > maxLen) s = `${s.slice(0, maxLen - 1)}…`;
  return s;
}
