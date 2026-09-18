/**
 * Compact Coursera language-support labels for marketing surfaces.
 * Levels match `LanguageSupport` on program records (full / subtitles /
 * ai-subtitles / none). English is always available and omitted here.
 */
import type { LanguageSupport, LanguageSupportLevel } from './programs';

const LANGUAGE_LABELS: Record<keyof LanguageSupport, string> = {
  es: 'Spanish',
  pt: 'Portuguese',
  fr: 'French',
};

function levelSuffix(level: LanguageSupportLevel): string {
  switch (level) {
    case 'full':
      return 'full';
    case 'subtitles':
      return 'subtitles';
    case 'ai-subtitles':
      return 'auto-subtitles';
    case 'none':
      return '';
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export type ActiveLanguageSupport = {
  code: keyof LanguageSupport;
  label: string;
  level: LanguageSupportLevel;
  chip: string;
};

/** Non-English languages with any Coursera support, in display order. */
export function activeLanguageSupports(
  languagesSupported: LanguageSupport | null | undefined,
): ActiveLanguageSupport[] {
  if (!languagesSupported) return [];
  return (Object.keys(LANGUAGE_LABELS) as (keyof LanguageSupport)[])
    .map((code) => {
      const level = languagesSupported[code];
      if (!level || level === 'none') return null;
      const label = LANGUAGE_LABELS[code];
      return {
        code,
        label,
        level,
        chip: `${label} (${levelSuffix(level)})`,
      };
    })
    .filter((entry): entry is ActiveLanguageSupport => entry !== null);
}

/** One-line summary for dense cards/tables, or null when English-only. */
export function languageSupportLine(
  languagesSupported: LanguageSupport | null | undefined,
): string | null {
  const active = activeLanguageSupports(languagesSupported);
  if (active.length === 0) return null;
  return active.map((entry) => entry.chip).join(' · ');
}
