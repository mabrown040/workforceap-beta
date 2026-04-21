'use client';

import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'wap-cookie-consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() }));
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
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
      }}
      role="dialog"
      aria-label="Cookie consent"
    >
      <div style={{ flex: 1, minWidth: 280 }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface)', lineHeight: 1.5 }}>
          We use cookies to improve your experience. By continuing, you agree to our{' '}
          <a href="/terms" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Terms</a> and{' '}
          <a href="/privacy" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Privacy Policy</a>.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
        <button
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
        <button
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
