/**
 * Escape text for safe interpolation into HTML email bodies and attributes.
 * Does not mark output as safe for raw HTML — use only for plain-text fields.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Strip newlines from values used in email Subject headers (header injection). */
export function sanitizeEmailSubjectLine(text: string, maxLen = 200): string {
  return text
    .replace(/[\r\n\u2028\u2029\u0085]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}
