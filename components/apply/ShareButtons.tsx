'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

const KNOWN_LOCALES = ['en', 'es', 'fr', 'pt'] as const;

/**
 * Build the URL to share. On the post-submit confirmation page
 * (`/apply/confirmation`, `/es/apply/confirmation`, …) `window.location.href`
 * points at the confirmation flow itself — recipients of a shared link
 * would land on a page they can't apply from. Always emit the public
 * `/apply` landing page, preserving the current locale segment when one
 * is present in the URL.
 */
function getShareUrl(): string {
  if (typeof window === 'undefined') return 'https://www.workforceap.org/apply';
  const { origin, pathname } = window.location;
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const localePrefix = (KNOWN_LOCALES as readonly string[]).includes(firstSegment)
    ? `/${firstSegment}`
    : '';
  return `${origin}${localePrefix}/apply`;
}

export default function ShareButtons() {
  const t = useTranslations('apply');
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleEmail = () => {
    window.location.href =
      `mailto:?subject=${encodeURIComponent(t('shareButtonEmailSubject'))}&body=${encodeURIComponent(`${t('shareButtonEmailBody')} ${getShareUrl()}`)}`;
  };

  const handleSms = () => {
    window.location.href =
      `sms:?body=${encodeURIComponent(`${t('shareButtonSmsBody')} ${getShareUrl()}`)}`;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
      <button type="button"
        onClick={handleCopyLink}
        className="flex flex-col items-center justify-center py-4 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl hover:bg-[var(--surface-container-low)] transition-colors group"
      >
        <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-accent)] transition-colors" aria-hidden="true">
          {copied ? 'check' : 'content_copy'}
        </span>
        <span aria-live="polite" className="text-[10px] mt-2 font-medium text-[var(--color-on-surface-variant)]">{copied ? t('shareButtonCopied') : t('shareButtonCopyLink')}</span>
      </button>
      <button type="button"
        onClick={handleEmail}
        className="flex flex-col items-center justify-center py-4 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl hover:bg-[var(--surface-container-low)] transition-colors group"
        aria-label={t('shareButtonEmailAria')}
      >
        <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-accent)] transition-colors" aria-hidden="true">mail</span>
        <span className="text-[10px] mt-2 font-medium text-[var(--color-on-surface-variant)]">{t('shareButtonEmail')}</span>
      </button>
      <button type="button"
        onClick={handleSms}
        className="flex flex-col items-center justify-center py-4 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl hover:bg-[var(--surface-container-low)] transition-colors group"
        aria-label={t('shareButtonSmsAria')}
      >
        <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-accent)] transition-colors" aria-hidden="true">chat_bubble</span>
        <span className="text-[10px] mt-2 font-medium text-[var(--color-on-surface-variant)]">{t('shareButtonSms')}</span>
      </button>
    </div>
  );
}
