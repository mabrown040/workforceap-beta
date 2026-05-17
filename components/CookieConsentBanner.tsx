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
  const [mobilePortalOffset, setMobilePortalOffset] = useState(false);

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
    const syncViewport = () => setMobilePortalOffset(window.innerWidth < 768);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    const previousPadding = document.body.style.paddingBottom;
    if (visible) {
      document.body.style.paddingBottom = mobilePortalOffset ? '14rem' : '8rem';
    }
    return () => {
      document.body.style.paddingBottom = previousPadding;
    };
  }, [visible, mobilePortalOffset]);

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
        bottom: mobilePortalOffset ? '5.25rem' : 0,
        left: 0,
        right: 0,
        background: 'var(--surface-container-high)',
        borderTop: '1px solid var(--outline-variant)',
        padding: '1rem 1.5rem',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.18)',
      }}
      role="dialog"
      aria-label="Cookie consent"
    >
      <div style={{ flex: 1, minWidth: 280 }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface)', lineHeight: 1.5 }}>
          We use cookies and similar technologies to improve your experience and measure how our site is used. See our{' '}
          <a href="/privacy" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Privacy Policy</a> and{' '}
          <a href="/terms" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Terms</a>.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
        <button type="button"
          onClick={decline}
          style={{
            padding: '0.5rem 1rem',
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
            padding: '0.5rem 1rem',
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
