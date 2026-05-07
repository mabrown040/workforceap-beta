'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function QueryToast() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const toast = searchParams.get('toast');
    if (toast) {
      setMessage(toast);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!visible || !message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        background: 'var(--color-accent-dark, #6b0c29)',
        color: '#fff',
        padding: '0.75rem 1.25rem',
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxWidth: '320px',
        lineHeight: 1.4,
      }}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
