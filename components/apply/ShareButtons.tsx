'use client';

import { useState, useRef, useEffect } from 'react';

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
      'mailto:?subject=Career Training at No Cost to Members&body=Check out WorkforceAP: ' + encodeURIComponent(getShareUrl());
  };

  const handleSms = () => {
    window.location.href =
      'sms:?body=Check out WorkforceAP career training at no cost to members: ' + encodeURIComponent(getShareUrl());
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
      <button type="button"
        onClick={handleCopyLink}
        className="flex flex-col items-center justify-center py-4 bg-white border border-[#debfc2]/10 rounded-xl hover:bg-[#f0edec] transition-colors group"
      >
        <span className="material-symbols-outlined text-[#584144] group-hover:text-[#8c0f37] transition-colors" aria-hidden="true">
          {copied ? 'check' : 'content_copy'}
        </span>
        <span aria-live="polite" className="text-[10px] mt-2 font-medium text-[#584144]">{copied ? 'Copied!' : 'Copy Link'}</span>
      </button>
      <button type="button"
        onClick={handleEmail}
        className="flex flex-col items-center justify-center py-4 bg-white border border-[#debfc2]/10 rounded-xl hover:bg-[#f0edec] transition-colors group"
        aria-label="Share via Email"
      >
        <span className="material-symbols-outlined text-[#584144] group-hover:text-[#8c0f37] transition-colors" aria-hidden="true">mail</span>
        <span className="text-[10px] mt-2 font-medium text-[#584144]">Email</span>
      </button>
      <button type="button"
        onClick={handleSms}
        className="flex flex-col items-center justify-center py-4 bg-white border border-[#debfc2]/10 rounded-xl hover:bg-[#f0edec] transition-colors group"
        aria-label="Share via SMS"
      >
        <span className="material-symbols-outlined text-[#584144] group-hover:text-[#8c0f37] transition-colors" aria-hidden="true">chat_bubble</span>
        <span className="text-[10px] mt-2 font-medium text-[#584144]">SMS</span>
      </button>
    </div>
  );
}
