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

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
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
      const search = typeof window !== 'undefined' ? window.location.search : '';
      router.replace(`${target}${search}`);
    } else {
      // Portal paths have no locale prefix — reload so middleware picks up the new cookie
      window.location.reload();
    }
  };

  if (compact) {
    return (
      <div className="language-toggle language-toggle--compact" aria-label={tCommon('selectLanguage')}>
        {languages.map((lang, index) => (
          <span key={lang.code} className="language-toggle__item">
            {lang.code === currentLocale ? (
              <span className="language-toggle__current">{lang.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => handleChange(lang.code)}
                className="language-toggle__link"
                suppressHydrationWarning
              >
                {lang.label}
              </button>
            )}
            {index < languages.length - 1 && (
              <span className="language-toggle__sep" aria-hidden="true">·</span>
            )}
          </span>
        ))}
      </div>
    );
  }

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
