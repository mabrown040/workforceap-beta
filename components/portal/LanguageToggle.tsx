'use client';

import { Globe } from 'lucide-react';
import { useLocale, type WAPLocale } from './LocaleContext';

const languages: { code: WAPLocale; label: string; labelNative: string }[] = [
  { code: 'en', label: 'English', labelNative: 'English' },
  { code: 'es', label: 'Español', labelNative: 'Español' },
];

export default function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="language-toggle" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
      <Globe size={16} aria-hidden style={{ color: 'var(--color-on-surface-variant)' }} />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as WAPLocale)}
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
