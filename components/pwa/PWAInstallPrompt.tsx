'use client';

import React, { useEffect, useState } from 'react';

const VISIT_KEY = 'wap:pwa-visits';
const DISMISSED_KEY = 'wap:pwa-install-dismissed';
const MIN_VISITS = 2;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // Count visits
    const raw = localStorage.getItem(VISIT_KEY);
    const visits = raw ? parseInt(raw, 10) : 0;
    const nextVisits = visits + 1;
    localStorage.setItem(VISIT_KEY, String(nextVisits));

    const dismissed = localStorage.getItem(DISMISSED_KEY) === '1';
    const eligible = nextVisits >= MIN_VISITS && !dismissed;

    if (!eligible) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If the app is already installed, hide the prompt
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISSED_KEY, '1');
    }
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        right: '1rem',
        zIndex: 9999,
        background: 'linear-gradient(135deg, var(--color-accent-dark, #8a233d), var(--color-accent, #ad2c4d))',
        color: '#fff',
        borderRadius: '1rem',
        padding: '1rem 1.25rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}
      role="alert"
      aria-live="polite"
    >
      <img
        src="/images/icon-192x192.png"
        alt=""
        aria-hidden="true"
        style={{ width: '40px', height: '40px', borderRadius: '0.5rem', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.3 }}>
          Install WorkforceAP
        </p>
        <p style={{ margin: '0.15rem 0 0', fontSize: '0.8125rem', opacity: 0.88, lineHeight: 1.4 }}>
          Add to your home screen for quick access.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          style={{
            background: '#fff',
            color: 'var(--color-accent-dark, #8a233d)',
            border: 'none',
            padding: '0.5rem 0.875rem',
            borderRadius: '0.5rem',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}
