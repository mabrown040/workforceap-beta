'use client';

import { useState, useEffect } from 'react';
import { ReadinessSkeleton } from '@/components/ui/Skeleton';

type Section = {
  section: number;
  title: string;
  items: Array<{
    key: string;
    label: string;
    type: 'checkbox' | 'text' | 'textarea';
    placeholder?: string;
    completed: boolean;
    completedAt?: string;
    completedBy?: string;
    notes?: string;
    valueText?: string;
  }>;
};

export default function ReadinessCounselorClient({ memberId }: { memberId: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>(() => ({}));
  const [pendingValues, setPendingValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/admin/members/${memberId}/readiness`)
      .then((r) => r.json())
      .then((d) => {
        setSections(d.sections ?? []);
        setExpanded((d.sections ?? []).reduce((acc: Record<number, boolean>, s: Section) => ({ ...acc, [s.section]: true }), {}));
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  const updateItem = async (itemKey: string, data: { completed?: boolean; valueText?: string; notes?: string }) => {
    setSaving(itemKey);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/readiness`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey, ...data }),
      });
      if (res.ok) {
        setSections((prev) =>
          prev.map((sec) => ({
            ...sec,
            items: sec.items.map((i) =>
              i.key === itemKey
                ? {
                    ...i,
                    completed: data.completed ?? i.completed,
                    valueText: data.valueText !== undefined ? data.valueText : i.valueText,
                    notes: data.notes !== undefined ? data.notes : i.notes,
                  }
                : i
            ),
          }))
        );
        setLastUpdated(new Date().toISOString());
      }
    } finally {
      setSaving(null);
    }
  };

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const completedItems = sections.reduce((acc, s) => acc + s.items.filter((i) => i.completed).length, 0);
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (loading) return <ReadinessSkeleton />;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#e8f5e9', borderRadius: '8px' }}>
        <strong>Progress:</strong> {completedItems} of {totalItems} items complete ({pct}%)
        {lastUpdated && (
          <span style={{ marginLeft: '1rem', fontSize: '0.9rem', color: '#666' }}>
            Last updated {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => window.print()}
        >
          Print / Export PDF
        </button>
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
              <span>{expanded[sec.section] ? '▼' : '▶'}</span>
            </button>
            {expanded[sec.section] !== false && (
              <div style={{ padding: '1rem', background: 'white' }}>
                {sec.items.map((item) => (
                  <div key={item.key} style={{ marginBottom: '1rem' }}>
                    {item.type === 'checkbox' ? (
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => updateItem(item.key, { completed: e.target.checked })}
                          disabled={!!saving}
                        />
                        <span>{item.label}</span>
                      </label>
                    ) : item.type === 'text' ? (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>{item.label}</label>
                        <input
                          type="text"
                          value={pendingValues[item.key] ?? item.valueText ?? ''}
                          onChange={(e) => setPendingValues((p) => ({ ...p, [item.key]: e.target.value }))}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== (item.valueText ?? '')) updateItem(item.key, { valueText: v });
                          }}
                          placeholder={item.placeholder}
                          style={{ width: '100%', maxWidth: '400px', padding: '0.5rem' }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>{item.label}</label>
                        <textarea
                          value={pendingValues[item.key] ?? item.valueText ?? ''}
                          onChange={(e) => setPendingValues((p) => ({ ...p, [item.key]: e.target.value }))}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== (item.valueText ?? '')) updateItem(item.key, { valueText: v });
                          }}
                          placeholder={item.placeholder}
                          rows={3}
                          style={{ width: '100%', maxWidth: '500px', padding: '0.5rem' }}
                        />
                      </div>
                    )}
                    <details style={{ marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#666' }}>Counselor notes</summary>
                      <textarea
                        value={pendingValues[`${item.key}_notes`] ?? item.notes ?? ''}
                        onChange={(e) => setPendingValues((p) => ({ ...p, [`${item.key}_notes`]: e.target.value }))}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v !== (item.notes ?? '')) updateItem(item.key, { notes: v });
                        }}
                        placeholder="Internal notes…"
                        rows={2}
                        style={{ width: '100%', maxWidth: '400px', padding: '0.5rem', marginTop: '0.25rem', fontSize: '0.9rem' }}
                      />
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', borderTop: '1px solid #eee', fontSize: '0.9rem', color: '#666' }}>
        <p>Client signature: _________________________ Date: _________</p>
        <p>Counselor signature: _________________________ Date: _________</p>
      </div>
    </div>
  );
}
