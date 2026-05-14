'use client';

import { Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const tCommon = useTranslations('common');
  const { locale, pathnameWithoutLocale } = splitLocalePrefix(pathname);

  const currentLocale: AppLocale = locale ?? 'en';
  const isPrefixedPath = !!locale;

  const handleChange = (code: string) => {
    if (!isAppLocale(code)) return;
    setLocaleCookie(code);
    if (isPrefixedPath) {
      const target =
        pathnameWithoutLocale === '/' ? withLocalePrefix('/', code) : withLocalePrefix(pathnameWithoutLocale, code);
      router.replace(target);
    } else {
      // Portal paths have no locale prefix — reload so middleware picks up the new cookie
      window.location.reload();
    }
  };

  return (
    <div className="language-toggle">
      <Globe size={16} aria-hidden className="language-toggle-icon" />
      <select
        value={currentLocale}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={tCommon('selectLanguage')}
        className="language-toggle-select"
        suppressHydrationWarning
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
