'use client';

import { useEffect, useState } from 'react';

type ReadinessCoachReturnButtonProps = {
  targetId?: string;
};

export default function ReadinessCoachReturnButton({
  targetId = 'readiness-coach-panel',
}: ReadinessCoachReturnButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}
      aria-label="Jump back to readiness coach"
      className="wa-md:wa-hidden"
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 55,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        minHeight: '2.75rem',
        padding: '0 0.95rem',
        borderRadius: '999px',
        border: '1px solid rgba(13, 148, 136, 0.24)',
        background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
        color: '#fff',
        fontSize: '0.82rem',
        fontWeight: 800,
        boxShadow: '0 14px 30px rgba(13, 148, 136, 0.28)',
      }}
    >
      <span aria-hidden style={{ fontSize: '1rem', lineHeight: 1 }}>🎯</span>
      Coach
    </button>
  );
}
