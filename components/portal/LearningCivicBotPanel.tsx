'use client';

import { useState } from 'react';

export default function LearningCivicBotPanel() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        right: 'var(--space-6)',
        width: '320px',
        background: 'var(--surface-container-low)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--outline-variant)',
        boxShadow: 'var(--shadow-glass)',
        overflow: 'hidden',
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: 'var(--color-accent)',
          color: 'var(--color-white)',
          padding: 'var(--space-4) var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', '--ms-fill': 1 }}>
          smart_toy
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>WorkforceAP Study Assistant</span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                background: 'rgba(255,255,255,0.25)',
              }}
            >
              Preview
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Conversational help is on the roadmap — use Training and pathways for now.</div>
        </div>
      </div>
      <div style={{ padding: 'var(--space-4)', minHeight: '120px' }}>
        <div
          style={{
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-on-surface-variant)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Hi! I can help you study, explain concepts, or quiz you on your current module. What would you like to work on?
        </div>
        {notice ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-accent)', margin: 0 }} role="status">
            {notice}
          </p>
        ) : null}
      </div>
      <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
        <div
          style={{
            flex: 1,
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-on-surface-variant)',
            opacity: 0.6,
          }}
        >
          Type a message…
        </div>
        <button
          type="button"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-white)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Send message"
          onClick={() => {
            setNotice('Chat coming soon — head to Training or your pathway modules to keep learning now.');
            window.setTimeout(() => setNotice(null), 6000);
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">
            send
          </span>
        </button>
      </div>
    </div>
  );
}
