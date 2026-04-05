'use client';

import Link from 'next/link';

/**
 * Highlights voice AI coaches on the AI toolkit hub (ElevenLabs).
 */
export default function VoiceCoachesPromo() {
  return (
    <section
      aria-label="Voice AI coaches"
      style={{
        maxWidth: '1100px',
        margin: '0 auto 2rem',
        padding: '0 clamp(1rem, 4vw, 1.5rem)',
      }}
    >
      <div
        style={{
          borderRadius: '1rem',
          padding: '1px',
          background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 45%, #ad2c4d 100%)',
          boxShadow: '0 20px 50px rgba(37, 99, 235, 0.15)',
        }}
      >
        <div
          style={{
            borderRadius: '0.94rem',
            background: 'var(--surface-container-lowest)',
            padding: '1.35rem clamp(1rem, 3vw, 1.75rem)',
            display: 'grid',
            gap: '1.25rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            alignItems: 'center',
          }}
        >
          <div>
            <p
              className="wa-text-[10px] wa-uppercase wa-tracking-[0.14em] wa-font-bold"
              style={{ color: 'var(--color-accent)', margin: '0 0 0.5rem' }}
            >
              Voice AI
            </p>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
              Talk it out with your coaches
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
              Natural voice sessions powered by ElevenLabs. Your program and organization context is passed to the coach
              automatically.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <Link
              href="/dashboard/ai-tools/voice-interview"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                textDecoration: 'none',
                background: 'linear-gradient(135deg, rgba(140,15,55,0.09), rgba(173,44,77,0.05))',
                border: '1px solid rgba(140,15,55,0.15)',
                color: 'var(--color-on-surface)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.35rem' }} aria-hidden>
                🎙
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: '0.92rem' }}>Voice Interview</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                  Mock interview for your target role
                </span>
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', opacity: 0.7 }}>
                chevron_right
              </span>
            </Link>
            <Link
              href="/dashboard/ai-tools/resume-rewriter"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                textDecoration: 'none',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(13,148,136,0.05))',
                border: '1px solid rgba(37,99,235,0.18)',
                color: 'var(--color-on-surface)',
              }}
            >
              <span style={{ fontSize: '1.35rem' }} aria-hidden>
                ✨
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: '0.92rem' }}>Resume Rewriter + Voice</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                  Open voice mode from the rewriter workflow
                </span>
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', opacity: 0.7 }}>
                chevron_right
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
