'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
];

export default function LanguageToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const { i18n } = useTranslation();

  const handleChange = (code: string) => {
    const newPath = pathname.replace(/^\/[a-z]{2}/, `/${code}`);
    router.push(newPath || `/${code}`);
    i18n.changeLanguage(code);
  };

  return (
    <div className="language-toggle">
      <Globe className="language-toggle-icon" />
      <select
        value={i18n.language}
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