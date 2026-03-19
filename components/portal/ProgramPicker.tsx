'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Program } from '@/lib/content/programs';
import { ProgramIcon } from '@/components/ProgramIcon';

type ProgramPickerProps = {
  programs: Program[];
};

export default function ProgramPicker({ programs }: ProgramPickerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSelect = async (slug: string) => {
    setError('');
    setLoading(slug);
    try {
      const res = await fetch('/api/member/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to enroll');
        setLoading(null);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Failed to enroll. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {programs.map((p) => (
          <div
            key={p.slug}
            style={{
              padding: '1.25rem',
              border: '1px solid var(--color-border, #e5e5e5)',
              borderRadius: 'var(--radius-md)',
              borderTop: `3px solid ${p.borderColor}`,
              background: 'white',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span
                style={{
                  background: p.categoryColor,
                  color: 'white',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '50px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {p.categoryLabel}
              </span>
              <span style={{ display: 'flex', alignItems: 'center' }}><ProgramIcon program={p} size={24} /></span>
            </div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{p.title}</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginBottom: '0.75rem' }}>
              <div>⏱ {p.duration}</div>
              <div style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{p.salary}</div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.6rem' }}
              onClick={() => handleSelect(p.slug)}
              disabled={!!loading}
            >
              {loading === p.slug ? 'Selecting...' : 'Select This Program'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
