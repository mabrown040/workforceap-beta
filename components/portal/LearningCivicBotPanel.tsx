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
        <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', fontVariationSettings: "'FILL' 1" }}>
          smart_toy
        </span>
        <div>
          <div style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>WorkforceAP Study Assistant</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Ask me anything about your courses</div>
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
            setNotice('Conversational study help is coming soon. Use Training and your pathway cards for now.');
            window.setTimeout(() => setNotice(null), 5000);
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
            send
          </span>
        </button>
      </div>
    </div>
  );
}
