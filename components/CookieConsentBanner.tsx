'use client';

import { useEffect, useState } from 'react';
import {
  detectGpc,
  pushConsentToGtag,
  readConsent,
  writeConsent,
} from '@/lib/consent/state';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [hasMobileBottomNav, setHasMobileBottomNav] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (existing.decision === 'unset') {
      if (detectGpc()) {
        // Honor the browser signal automatically and skip showing the banner.
        // The privacy policy commits to treating GPC as a valid opt-out.
        writeConsent('declined', { fromGpc: true });
        pushConsentToGtag('declined');
      } else {
        setVisible(true);
      }
    }
    const syncViewport = () => {
      setIsMobileViewport(window.innerWidth < 768);
      setHasMobileBottomNav(Boolean(document.getElementById('mobile-bottom-nav')));
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    const previousPadding = document.body.style.paddingBottom;
    if (visible) {
      // Generous padding to ensure banner + bottom nav never overlap CTAs/forms.
      // Banner height ~70px + bottom nav ~84px + safety gap = ~220px+.
      document.body.style.paddingBottom = isMobileViewport
        ? hasMobileBottomNav
          ? '14rem'
          : '8rem'
        : '8rem';
    }
    return () => {
      document.body.style.paddingBottom = previousPadding;
    };
  }, [visible, isMobileViewport, hasMobileBottomNav]);

  const accept = () => {
    writeConsent('accepted');
    pushConsentToGtag('accepted');
    setVisible(false);
  };

  const decline = () => {
    writeConsent('declined');
    pushConsentToGtag('declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isMobileViewport
          ? hasMobileBottomNav
            ? '5.5rem'
            : 'calc(0.75rem + env(safe-area-inset-bottom, 0px))'
          : 0,
        left: isMobileViewport ? '0.75rem' : 0,
        right: isMobileViewport ? '0.75rem' : 0,
        background: 'var(--surface-container-high)',
        border: '1px solid var(--outline-variant)',
        borderRadius: isMobileViewport ? 'var(--radius-lg)' : 0,
        padding: isMobileViewport ? '0.7rem 0.8rem' : '1rem 1.5rem',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: isMobileViewport ? '0.65rem' : '1rem',
        flexWrap: isMobileViewport ? 'nowrap' : 'wrap',
        justifyContent: 'space-between',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.18)',
      }}
      role="dialog"
      aria-label="Cookie consent"
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: isMobileViewport ? '0.75rem' : '0.85rem', color: 'var(--color-on-surface)', lineHeight: isMobileViewport ? 1.35 : 1.5 }}>
          {isMobileViewport
            ? 'We use cookies to improve and measure this site. '
            : 'We use cookies and similar technologies to improve your experience and measure how our site is used. '}
          See our{' '}
          <a href="/privacy" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Privacy</a> and{' '}
          <a href="/terms" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Terms</a>.
        </p>
      </div>
      <div style={{ display: 'flex', gap: isMobileViewport ? '0.5rem' : '0.75rem', flexShrink: 0 }}>
        <button type="button"
          onClick={decline}
          style={{
            minHeight: 44,
            padding: isMobileViewport ? '0.5rem 0.75rem' : '0.5rem 1rem',
            background: 'transparent',
            color: 'var(--color-on-surface-variant)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Decline
        </button>
        <button type="button"
          onClick={accept}
          style={{
            minHeight: 44,
            padding: isMobileViewport ? '0.5rem 0.85rem' : '0.5rem 1rem',
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
