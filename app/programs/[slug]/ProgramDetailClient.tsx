'use client';

import { useState } from 'react';
import type { Program } from '@/lib/content/programs';

export default function ProgramDetailClient({ program }: { program: Program }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Skills you&apos;ll learn</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {program.skills.map((s) => (
            <span
              key={s}
              style={{
                background: '#f0f0f0',
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Course list</h2>
      <div style={{ border: '1px solid var(--color-border, #e5e5e5)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {program.courses.map((c, i) => {
          const isOpen = openIndex === i;
          const panelId = `program-course-panel-${c.slug}`;

          return (
            <div
              key={c.slug}
              style={{ borderBottom: i < program.courses.length - 1 ? '1px solid #eee' : 'none' }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  font: 'inherit',
                }}
              >
                <span>
                  <span style={{ marginRight: '0.5rem' }}>{i + 1}.</span>
                  {c.name}
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginLeft: '0.5rem' }}>
                    ~{c.estimatedHours} hrs
                  </span>
                </span>
                <span aria-hidden="true" style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem', flexShrink: 0 }}>
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen ? (
                <div
                  id={panelId}
                  style={{ padding: '0 1rem 1rem 1rem', paddingLeft: '2rem', fontSize: '0.9rem', color: 'var(--color-gray-600)' }}
                >
                  Part of the {program.title} program.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
