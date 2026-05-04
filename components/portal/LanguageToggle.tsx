'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
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
    <div className="language-toggle">
      <Globe className="language-toggle-icon" />
      <select
        value={selectValue}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Select language"
        className="language-toggle-select"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
