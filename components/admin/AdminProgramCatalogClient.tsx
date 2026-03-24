'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type CatalogRow = {
  id: string;
  programSlug: string;
  name: string;
  description: string | null;
  category: string;
  deliveryType: string;
  deliveryUrl: string | null;
  deliveryDetails: string | null;
  certifications: string[];
  duration: string | null;
  status: string;
  displayOrder: number;
  featured: boolean;
};

const DELIVERY = ['external_lms', 'youtube', 'in_person', 'virtual', 'internal'] as const;
const STATUS = ['active', 'coming_soon', 'inactive'] as const;

export default function AdminProgramCatalogClient() {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/programs/catalog');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Load failed');
      setRows(data.programs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [rows]
  );

  const patchRow = async (id: string, patch: Partial<CatalogRow>) => {
    setSavingId(id);
    setError('');
    try {
      const res = await fetch('/api/admin/programs/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[next];
    await patchRow(a.id, { displayOrder: b.displayOrder });
    await patchRow(b.id, { displayOrder: a.displayOrder });
    await load();
  };

  if (loading) return <p style={{ color: 'var(--color-gray-600)' }}>Loading catalog…</p>;

  return (
    <div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p style={{ marginBottom: '1rem', color: 'var(--color-gray-600)', fontSize: '0.9rem' }}>
        Rows sync with static program slugs (enrollment and course progress). Edit display names, delivery links, and status — homepage and member enrollment use active programs.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Slug</th>
              <th>Name</th>
              <th>Category</th>
              <th>Delivery</th>
              <th>Status</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button type="button" className="btn btn-outline btn-sm" disabled={i === 0 || savingId === r.id} onClick={() => void move(i, -1)} aria-label="Move up">
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={i === sorted.length - 1 || savingId === r.id}
                      onClick={() => void move(i, 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td><code style={{ fontSize: '0.8rem' }}>{r.programSlug}</code></td>
                <td>
                  <input
                    style={{ width: '100%', minWidth: '140px', fontSize: '0.875rem' }}
                    defaultValue={r.name}
                    key={`${r.id}-name`}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== r.name) void patchRow(r.id, { name: v });
                    }}
                  />
                </td>
                <td>
                  <input
                    style={{ width: '100%', minWidth: '100px', fontSize: '0.875rem' }}
                    defaultValue={r.category}
                    key={`${r.id}-cat`}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== r.category) void patchRow(r.id, { category: v });
                    }}
                  />
                </td>
                <td>
                  <select
                    style={{ fontSize: '0.875rem', maxWidth: '140px' }}
                    value={r.deliveryType}
                    disabled={savingId === r.id}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (DELIVERY.includes(v as (typeof DELIVERY)[number])) void patchRow(r.id, { deliveryType: v });
                    }}
                  >
                    {DELIVERY.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    style={{ fontSize: '0.875rem', maxWidth: '120px' }}
                    value={r.status}
                    disabled={savingId === r.id}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (STATUS.includes(v as (typeof STATUS)[number])) void patchRow(r.id, { status: v });
                    }}
                  >
                    {STATUS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={r.featured}
                    disabled={savingId === r.id}
                    onChange={(e) => void patchRow(r.id, { featured: e.target.checked })}
                  />
                </td>
                <td>
                  <details>
                    <summary style={{ cursor: 'pointer', color: 'var(--color-accent, #2563eb)' }}>Edit fields</summary>
                    <div style={{ padding: '0.75rem 0', maxWidth: '420px' }}>
                      <label className="form-group" style={{ display: 'block', marginBottom: '0.75rem' }}>
                        <span>Description</span>
                        <textarea
                          rows={3}
                          style={{ width: '100%', fontSize: '0.875rem' }}
                          defaultValue={r.description ?? ''}
                          key={`${r.id}-desc`}
                          onBlur={(e) => {
                            const v = e.target.value.trim() || null;
                            if (v !== r.description) void patchRow(r.id, { description: v });
                          }}
                        />
                      </label>
                      {(r.deliveryType === 'external_lms' || r.deliveryType === 'youtube' || r.deliveryType === 'virtual') && (
                        <label className="form-group" style={{ display: 'block', marginBottom: '0.75rem' }}>
                          <span>URL</span>
                          <input
                            type="url"
                            style={{ width: '100%', fontSize: '0.875rem' }}
                            defaultValue={r.deliveryUrl ?? ''}
                            key={`${r.id}-url`}
                            onBlur={(e) => {
                              const v = e.target.value.trim() || null;
                              if (v !== r.deliveryUrl) void patchRow(r.id, { deliveryUrl: v });
                            }}
                          />
                        </label>
                      )}
                      {(r.deliveryType === 'in_person' || r.deliveryType === 'internal') && (
                        <label className="form-group" style={{ display: 'block', marginBottom: '0.75rem' }}>
                          <span>Location / details</span>
                          <textarea
                            rows={2}
                            style={{ width: '100%', fontSize: '0.875rem' }}
                            defaultValue={r.deliveryDetails ?? ''}
                            key={`${r.id}-det`}
                            onBlur={(e) => {
                              const v = e.target.value.trim() || null;
                              if (v !== r.deliveryDetails) void patchRow(r.id, { deliveryDetails: v });
                            }}
                          />
                        </label>
                      )}
                      <label className="form-group" style={{ display: 'block' }}>
                        <span>Duration label</span>
                        <input
                          style={{ width: '100%', fontSize: '0.875rem' }}
                          defaultValue={r.duration ?? ''}
                          key={`${r.id}-dur`}
                          onBlur={(e) => {
                            const v = e.target.value.trim() || null;
                            if (v !== r.duration) void patchRow(r.id, { duration: v });
                          }}
                        />
                      </label>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
