/**
 * Plain-English copy for O*NET-derived strings. Do not surface raw government phrasing.
 */

const GENERIC_OPENERS = /^(coordinates?|performs?|analyzes?|develops?|designs?|implements?|maintains?|evaluates?)\s+/i;

export function translateOccupationDescription(raw: string | null | undefined, title: string): string {
  if (!raw?.trim()) {
    return `Work in this field focuses on skills and tasks similar to ${title.toLowerCase()} roles in today's job market.`;
  }
  let s = raw.replace(/\s+/g, ' ').trim();
  if (s.length > 380) {
    s = s.slice(0, 377).trim() + '…';
  }
  if (GENERIC_OPENERS.test(s)) {
    s = s.replace(GENERIC_OPENERS, 'In this role, you often ');
  }
  return s;
}

export function translateTaskLine(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  s = s.replace(/^[\d.]+\s*/, '');
  if (s.length > 140) s = s.slice(0, 137).trim() + '…';
  if (GENERIC_OPENERS.test(s)) {
    s = s.replace(GENERIC_OPENERS, 'You might ');
  }
  return s;
}

export function translateSkillName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}
