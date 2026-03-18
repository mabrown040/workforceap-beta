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
        {program.courses.map((c, i) => (
          <details
            key={c.slug}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            style={{ borderBottom: i < program.courses.length - 1 ? '1px solid #eee' : 'none' }}
          >
            <summary style={{ padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 500, listStyle: 'none' }}>
              <span style={{ marginRight: '0.5rem' }}>{i + 1}.</span>
              {c.name}
              <span style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginLeft: '0.5rem' }}>
                ~{c.estimatedHours} hrs
              </span>
            </summary>
            <div style={{ padding: '0 1rem 1rem 1rem', paddingLeft: '2rem', fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
              Part of the {program.title} program.
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
