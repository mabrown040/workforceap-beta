'use client';

import { Globe } from 'lucide-react';
import type { AppLocale } from '@/lib/i18n/config';
import { isAppLocale, splitLocalePrefix, withLocalePrefix } from '@/lib/i18n/config';
import { setLocaleCookie } from '@/lib/i18n/client';

const languages: { code: AppLocale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
];

export default function LanguageToggle() {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const { i18n } = useTranslation();
  const { pathnameWithoutLocale } = splitLocalePrefix(pathname);

  const handleChange = (code: string) => {
    if (!isAppLocale(code)) return;
    setLocaleCookie(code);
    const target =
      pathnameWithoutLocale === '/' ? withLocalePrefix('/', code) : withLocalePrefix(pathnameWithoutLocale, code);
    void i18n.changeLanguage(code);
    router.replace(target);
  };

  const selectValue = (() => {
    const { locale } = splitLocalePrefix(pathname);
    if (locale) return locale;
    const fromI18n = i18n.language?.split('-')[0];
    return fromI18n && isAppLocale(fromI18n) ? fromI18n : 'en';
  })();

  return (
    <div className="language-toggle" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
      <Globe size={16} aria-hidden style={{ color: 'var(--color-on-surface-variant)' }} />
      <select
        value={selectValue}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Select language"
        className="language-toggle-select"
        style={{
          background: 'transparent',
          border: '1px solid var(--outline-variant)',
          borderRadius: '0.5rem',
          padding: '0.25rem 0.5rem',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--color-on-surface)',
          cursor: 'pointer',
        }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.labelNative}
          </option>
        ))}
      </select>
    </div>
  );
}
