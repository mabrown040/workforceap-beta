/**
 * Plain-English copy for O*NET-derived strings. Do not surface raw government phrasing.
 */

import { ONET_CODE_PATTERN } from '@/lib/onet/occupationTitles';

const GENERIC_OPENERS = /^(coordinates?|performs?|analyzes?|develops?|designs?|implements?|maintains?|evaluates?)\s+/i;

export function translateOccupationDescription(raw: string | null | undefined, title: string): string {
  if (!raw?.trim()) {
    // If the title is still a raw SOC code (e.g. "15-1252.00"), fall back to a
    // generic phrasing so we never surface the code to members.
    const safeTitle = title?.trim();
    if (!safeTitle || ONET_CODE_PATTERN.test(safeTitle)) {
      return 'Work in this field focuses on skills and tasks similar to roles in this career area in today’s job market.';
    }
    return `Work in this field focuses on skills and tasks similar to ${safeTitle.toLowerCase()} roles in today’s job market.`;
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
