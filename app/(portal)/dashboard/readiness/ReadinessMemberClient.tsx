'use client';

import { useState, useEffect } from 'react';
import { ReadinessSkeleton } from '@/components/ui/Skeleton';

type Section = {
  section: number;
  title: string;
  items: Array<{
    key: string;
    label: string;
    type: string;
    completed: boolean;
    valueText?: string;
  }>;
};

export default function ReadinessMemberClient() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch('/api/member/readiness')
      .then((r) => r.json())
      .then((d) => {
        setSections(d.sections ?? []);
        setExpanded(d.sections?.reduce((acc: Record<number, boolean>, s: Section) => ({ ...acc, [s.section]: true }), {}) ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const completedItems = sections.reduce((acc, s) => acc + s.items.filter((i) => i.completed).length, 0);
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (loading) return <ReadinessSkeleton />;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(74, 155, 79, 0.1)', borderRadius: '8px', border: '1px solid rgba(74, 155, 79, 0.3)' }}>
        <strong>Your career readiness: {pct}%</strong>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
          {completedItems} of {totalItems} items complete. Your counselor updates this as you progress.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sections.map((sec) => (
          <div key={sec.section} style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setExpanded((e) => ({ ...e, [sec.section]: !e[sec.section] }))}
              style={{
                width: '100%',
                padding: '1rem',
                background: '#f5f5f5',
                border: 'none',
                textAlign: 'left',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Section {sec.section}: {sec.title}</span>
              <span>{expanded[sec.section] !== false ? '▼' : '▶'}</span>
            </button>
            {expanded[sec.section] !== false && (
              <div style={{ padding: '1rem', background: 'white' }}>
                {sec.items.map((item) => (
                  <div key={item.key} style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ flexShrink: 0 }}>{item.completed ? '✅' : '⬜'}</span>
                    <div>
                      <span>{item.label}</span>
                      {item.valueText && (
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#666' }}>{item.valueText}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
