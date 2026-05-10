'use client';

import { Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import type { AppLocale } from '@/lib/i18n/config';
import { isAppLocale, splitLocalePrefix, withLocalePrefix } from '@/lib/i18n/config';
import { setLocaleCookie } from '@/lib/i18n/client';

// `fr` / `pt` were removed from the picker on 2026-05-10 because their
// translation files are still ~281 keys behind English (every missing
// key falls back to English via the deep-merge in i18n/request.ts).
// Showing them in the dropdown promised more localization than we
// actually deliver. The locale codes themselves remain valid in URLs
// and headers — AI features (interview practice, resume rewriter) can
// still target French/Portuguese as a generation language even when
// the UI chrome is English. Re-add here once the translation pass
// lands or the dropdown becomes dishonest the moment a member picks it.
const languages: { code: AppLocale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

export default function LanguageToggle() {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const { locale, pathnameWithoutLocale } = splitLocalePrefix(pathname);

  const currentLocale: AppLocale = locale ?? 'en';

  const handleChange = (code: string) => {
    if (!isAppLocale(code)) return;
    setLocaleCookie(code);
    const target =
      pathnameWithoutLocale === '/' ? withLocalePrefix('/', code) : withLocalePrefix(pathnameWithoutLocale, code);
    router.replace(target);
  };

  return (
    <div className="language-toggle">
      <Globe size={16} aria-hidden className="language-toggle-icon" />
      <select
        value={currentLocale}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Select language"
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
