'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

type MemberRow = { id: string; fullName: string; email: string };

export default function CreateEmployerAccountClient() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<MemberRow[]>([]);
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members?q=${encodeURIComponent(term)}&limit=20`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Search failed');
        setHits([]);
        return;
      }
      setHits(data as MemberRow[]);
    } finally {
      setSearching(false);
    }
  }, [q]);

  function pickMember(m: MemberRow) {
    setSelected(m);
    setContactName(m.fullName);
    setContactEmail(m.email);
    setHits([]);
    setQ('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError('Search and select a user who will log in to the employer portal.');
      return;
    }
    if (!companyName.trim() || !contactName.trim() || !contactEmail.trim()) {
      setError('Company name, contact name, and contact email are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/employers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selected.id,
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || null,
          companyWebsite: companyWebsite.trim() ? companyWebsite.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not create employer account');
        return;
      }
      setSelected(null);
      setCompanyName('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setCompanyWebsite('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Create employer portal account</h2>
      <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        Link an existing site user (they sign in with their usual email) to a company record so they can use{' '}
        <strong>/employer</strong>. Super-admins can then use <strong>Open portal</strong> to work inside their account.
      </p>

      {error && (
        <div
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            background: '#fee',
            borderRadius: 'var(--radius-sm)',
            color: '#c00',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={submit} style={{ maxWidth: 520 }}>
        <div className="form-group">
          <label>Find user by name or email</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. name or email"
              disabled={saving}
              style={{ flex: '1 1 200px' }}
            />
            <button type="button" className="btn btn-secondary" onClick={search} disabled={searching || saving}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
          {hits.length > 0 && (
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0.5rem 0 0',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {hits.map((m) => (
                <li key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <button
                    type="button"
                    onClick={() => pickMember(m)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      background: 'var(--color-light)',
                      border: 'none',
                      cursor: 'pointer',
                      font: 'inherit',
                    }}
                  >
                    <strong>{m.fullName}</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>{m.email}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
            Selected: <strong>{selected.fullName}</strong> ({selected.email})
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: '0.5rem' }}
              onClick={() => setSelected(null)}
            >
              Clear
            </button>
          </p>
        )}

        <div className="form-group">
          <label>Company name *</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            disabled={saving}
          />
        </div>
        <div className="form-group">
          <label>Contact name *</label>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} required disabled={saving} />
        </div>
        <div className="form-group">
          <label>Contact email *</label>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required disabled={saving} />
        </div>
        <div className="form-group">
          <label>Contact phone</label>
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} disabled={saving} />
        </div>
        <div className="form-group">
          <label>Company website</label>
          <input
            type="url"
            placeholder="https://"
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
            disabled={saving}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create employer account'}
        </button>
      </form>
    </section>
  );
}
