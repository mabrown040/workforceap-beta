'use client';

import { useCallback, useEffect, useState } from 'react';
import { PROGRAMS } from '@/lib/content/programs';

type MappingRow = {
  id: string;
  onetCode: string;
  programSlug: string;
  priority: number;
  experienceBand: string;
  recommendationType: string;
  whyRecommended: string | null;
  isActive: boolean;
};

export default function CareerMappingsClient() {
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<{ code: string; title: string }[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [programSlug, setProgramSlug] = useState(PROGRAMS[0]?.slug ?? '');
  const [experienceBand, setExperienceBand] = useState<'beginner' | 'some_experience' | 'experienced'>('beginner');
  const [recommendationType, setRecommendationType] = useState<'primary' | 'bridge' | 'stretch'>('primary');
  const [priority, setPriority] = useState(1);
  const [whyRecommended, setWhyRecommended] = useState('');

  const loadMappings = useCallback(async (onetCode: string) => {
    if (!onetCode.trim()) {
      setMappings([]);
      return;
    }
    const res = await fetch(`/api/admin/onet/mappings?onetCode=${encodeURIComponent(onetCode)}`);
    const data = await res.json();
    setMappings(data.mappings ?? []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQ.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      fetch(`/api/admin/onet/search?q=${encodeURIComponent(searchQ.trim())}`)
        .then((r) => r.json())
        .then((d) => setSearchResults(d.occupations ?? []))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const selectOccupation = (code: string, title: string) => {
    setSelectedCode(code);
    setSelectedTitle(title);
    setSearchQ('');
    setSearchResults([]);
    void loadMappings(code);
  };

  const saveMapping = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/onet/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onetCode: selectedCode,
          programSlug,
          priority,
          experienceBand,
          recommendationType,
          whyRecommended: whyRecommended || null,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setMessage('Saved mapping.');
      await loadMappings(selectedCode);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const syncOccupation = async () => {
    if (!selectedCode) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/onet/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onetCodes: [selectedCode] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      setMessage(
        data.errors?.length ? `Synced with notes: ${data.errors.join('; ')}` : 'Synced occupation from O*NET.'
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page" style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Career mappings (O*NET)</h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
        Search O*NET occupations, sync details into the local cache, and map each occupation to WorkforceAP programs by
        experience band.
      </p>

      {message && (
        <p style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--surface-container-low)' }}>
          {message}
        </p>
      )}

      <section style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Search occupations</label>
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="e.g. cybersecurity, help desk"
          className="input"
          style={{ width: '100%', maxWidth: 400 }}
        />
        {searchResults.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '0.5rem 0 0',
              border: '1px solid var(--outline-variant)',
              borderRadius: 8,
              maxHeight: 220,
              overflow: 'auto',
            }}
          >
            {searchResults.map((o) => (
              <li key={o.code}>
                <button
                  type="button"
                  onClick={() => selectOccupation(o.code, o.title)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <strong>{o.code}</strong> — {o.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedCode && (
        <>
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem' }}>Selected</h2>
            <p>
              <strong>{selectedCode}</strong> — {selectedTitle}
            </p>
            <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => void syncOccupation()}>
              Sync from O*NET API
            </button>
          </section>

          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Existing mappings</h2>
            {mappings.length === 0 ? (
              <p>No mappings yet for this code.</p>
            ) : (
              <ul style={{ paddingLeft: '1.25rem' }}>
                {mappings.map((m) => (
                  <li key={m.id} style={{ marginBottom: '0.5rem' }}>
                    {m.experienceBand} / {m.programSlug} (p{m.priority}, {m.recommendationType})
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Add mapping</h2>
            <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
              <label>
                Program
                <select
                  className="input"
                  value={programSlug}
                  onChange={(e) => setProgramSlug(e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                >
                  {PROGRAMS.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Experience band
                <select
                  className="input"
                  value={experienceBand}
                  onChange={(e) => setExperienceBand(e.target.value as typeof experienceBand)}
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                >
                  <option value="beginner">beginner</option>
                  <option value="some_experience">some_experience</option>
                  <option value="experienced">experienced</option>
                </select>
              </label>
              <label>
                Recommendation type
                <select
                  className="input"
                  value={recommendationType}
                  onChange={(e) => setRecommendationType(e.target.value as typeof recommendationType)}
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                >
                  <option value="primary">primary</option>
                  <option value="bridge">bridge</option>
                  <option value="stretch">stretch</option>
                </select>
              </label>
              <label>
                Priority (1 = highest)
                <input
                  type="number"
                  min={1}
                  max={99}
                  className="input"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value, 10) || 1)}
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                />
              </label>
              <label>
                Why recommended (optional)
                <textarea
                  className="input"
                  rows={3}
                  value={whyRecommended}
                  onChange={(e) => setWhyRecommended(e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                />
              </label>
              <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void saveMapping()}>
                Save mapping
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
