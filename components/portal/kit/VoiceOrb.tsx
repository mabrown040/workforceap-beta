'use client';

import { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

/**
 * VoiceOrb — the shared, audio-reactive voice orb used by both the Voice Studio
 * "Live Session" tab and the standalone PortalVoiceSession.
 *
 * It runs its own requestAnimationFrame loop that polls `getLevel()` (0..1) and
 * mutates the DOM directly (orb scale + ring opacity), so the parent never
 * re-renders per frame. When `active` is false it sits static and dimmed; when
 * the session is live the core breathes and expanding rings track the live
 * mic/agent volume. Honors `prefers-reduced-motion: reduce`.
 */
export interface VoiceOrbProps {
  /** Returns the current audio level 0..1 (e.g. max of input/output volume). */
  getLevel?: () => number;
  /** Session is connected and running. */
  active: boolean;
  /** Mic is muted — orb goes grey and stops reacting. */
  muted?: boolean;
  /** Connecting (pre-active) — gentle pulse, no rings. */
  connecting?: boolean;
  /** Diameter of the core in px. */
  size?: number;
  accent?: string;
  accentDark?: string;
  /** Show a mic / mic-off glyph in the core. */
  showIcon?: boolean;
}

const RING_KEYFRAMES = `
@keyframes voiceorb-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@media (prefers-reduced-motion: reduce) { .voiceorb-core-anim { animation: none !important; } }
`;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function VoiceOrb({
  getLevel,
  active,
  muted = false,
  connecting = false,
  size = 168,
  accent = 'var(--wa-accent)',
  accentDark = 'var(--wa-accent-dark)',
  showIcon = true,
}: VoiceOrbProps) {
  const coreRef = useRef<HTMLDivElement | null>(null);
  const ring1Ref = useRef<HTMLSpanElement | null>(null);
  const ring2Ref = useRef<HTMLSpanElement | null>(null);
  const ring3Ref = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedRef = useRef(0);

  useEffect(() => {
    if (document.getElementById('voiceorb-styles')) return;
    const el = document.createElement('style');
    el.id = 'voiceorb-styles';
    el.textContent = RING_KEYFRAMES;
    document.head.appendChild(el);
  }, []);

  useEffect(() => {
    const reduce = prefersReducedMotion();
    const reactive = active && !muted && !reduce;

    if (!reactive) {
      // Reset to a calm resting state.
      smoothedRef.current = 0;
      if (coreRef.current) coreRef.current.style.transform = 'scale(1)';
      [ring1Ref, ring2Ref, ring3Ref].forEach((r) => {
        if (r.current) {
          r.current.style.opacity = '0';
          r.current.style.transform = 'scale(1)';
        }
      });
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const raw = Math.max(0, Math.min(1, getLevel?.() ?? 0));
      // Smooth toward the raw level — fast attack, slower release.
      const prev = smoothedRef.current;
      const next = raw > prev ? prev + (raw - prev) * 0.5 : prev + (raw - prev) * 0.18;
      smoothedRef.current = next;

      const core = coreRef.current;
      if (core) core.style.transform = `scale(${(1 + next * 0.22).toFixed(3)})`;

      // Rings expand + fade with level; staggered radii so they read as pulses.
      const rings = [ring1Ref.current, ring2Ref.current, ring3Ref.current];
      rings.forEach((r, i) => {
        if (!r) return;
        const spread = 1 + next * (0.45 + i * 0.28);
        r.style.transform = `scale(${spread.toFixed(3)})`;
        r.style.opacity = (Math.max(0, 0.55 - i * 0.16) * (0.3 + next)).toFixed(3);
      });

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active, muted, getLevel]);

  const wrap = Math.round(size * 1.4);
  const ringStyle: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: 999,
    border: `1.5px solid ${accent}`,
    opacity: 0,
    pointerEvents: 'none',
    willChange: 'transform, opacity',
  };

  const dimmed = !active && !connecting;

  return (
    <div
      style={{
        position: 'relative',
        width: `min(${wrap}px, 64vw)`,
        height: `min(${wrap}px, 64vw)`,
        maxWidth: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span ref={ring1Ref} style={ringStyle} aria-hidden />
      <span ref={ring2Ref} style={ringStyle} aria-hidden />
      <span ref={ring3Ref} style={ringStyle} aria-hidden />
      <div
        ref={coreRef}
        className={connecting && !prefersReducedMotion() ? 'voiceorb-core-anim' : undefined}
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          background: muted
            ? 'linear-gradient(135deg, color-mix(in srgb, var(--wa-sidebar-muted) 36%, var(--wa-sidebar-bg)), var(--wa-sidebar-border))'
            : `radial-gradient(circle at 35% 32%, ${accent}, ${accentDark})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--wa-on-accent)',
          /* 40% alpha glow of the accent; color-mix so `accent` may be a var() */
          boxShadow: `0 25px 50px -12px color-mix(in srgb, ${accent} 40%, transparent)`,
          opacity: dimmed ? 0.7 : 1,
          transition: 'background 0.25s, opacity 0.25s',
          animation: connecting && !prefersReducedMotion() ? 'voiceorb-breathe 1.6s ease-in-out infinite' : undefined,
          willChange: 'transform',
        }}
      >
        {showIcon ? (muted ? <MicOff size={Math.round(size * 0.25)} aria-hidden /> : <Mic size={Math.round(size * 0.25)} aria-hidden />) : null}
      </div>
    </div>
  );
}
