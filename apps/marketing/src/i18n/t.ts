import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import pt from './pt.json';

const MESSAGES: Record<string, unknown> = { en, es, fr, pt };

export const LOCALES = ['en', 'es', 'fr', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English', es: 'Español', fr: 'Français', pt: 'Português',
};
export const NON_DEFAULT_LOCALES = LOCALES.filter((l) => l !== 'en');

function dig(obj: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

/** t(key) for a locale; falls back to English for any missing key (like the Next deepMerge). */
export function useT(locale: string) {
  const loc = (LOCALES as readonly string[]).includes(locale) ? locale : 'en';
  return (key: string): string => {
    const v = dig(MESSAGES[loc], key);
    if (typeof v === 'string') return v;
    const f = dig(MESSAGES.en, key);
    return typeof f === 'string' ? f : key;
  };
}

export function isLocale(x: string | undefined): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x);
}
