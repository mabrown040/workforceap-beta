'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  defaultName: string;
  defaultOverviewVideoUrl: string;
};

export default function AdminOrgSettingsForm({ defaultName, defaultOverviewVideoUrl }: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [overviewVideoUrl, setOverviewVideoUrl] = useState(defaultOverviewVideoUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk(false);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          overviewVideoUrl: overviewVideoUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setOk(true);
      router.refresh();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={save} style={{ maxWidth: '520px' }}>
      {error && <p className="form-error" role="alert">{error}</p>}
      {ok && <p style={{ color: 'green', marginBottom: '0.75rem' }}>Saved.</p>}
      <div className="form-group">
        <label htmlFor="orgName">Organization display name</label>
        <input id="orgName" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label htmlFor="vid">Overview step video URL (Loom, YouTube, Vimeo)</label>
        <input
          id="vid"
          type="url"
          value={overviewVideoUrl}
          onChange={(e) => setOverviewVideoUrl(e.target.value)}
          placeholder="https://..."
        />
        <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginTop: '0.35rem' }}>
          Shown on the public &ldquo;How it works&rdquo; page for the Overview step. Leave blank to use text only.
        </p>
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
