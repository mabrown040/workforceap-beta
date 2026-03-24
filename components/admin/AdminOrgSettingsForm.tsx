'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  defaultName: string;
  defaultOverviewVideoUrl: string;
  defaultLogoUrl: string;
  defaultPrimaryColor: string;
};

export default function AdminOrgSettingsForm({
  defaultName,
  defaultOverviewVideoUrl,
  defaultLogoUrl,
  defaultPrimaryColor,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [overviewVideoUrl, setOverviewVideoUrl] = useState(defaultOverviewVideoUrl);
  const [primaryColor, setPrimaryColor] = useState(defaultPrimaryColor || '#2563eb');
  const [logoUrl, setLogoUrl] = useState(defaultLogoUrl);
  const [logoUploading, setLogoUploading] = useState(false);
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
          primaryColor: /^#[0-9A-Fa-f]{6}$/.test(primaryColor.trim()) ? primaryColor.trim() : null,
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

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/organization/logo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Logo upload failed');
      if (data.logo) setLogoUrl(data.logo);
      setOk(true);
      router.refresh();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Logo upload failed');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
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
        <label htmlFor="logo">Organization logo</label>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" style={{ display: 'block', maxHeight: 48, marginBottom: '0.5rem' }} />
        ) : null}
        <input id="logo" type="file" accept="image/*" onChange={(e) => void onLogo(e)} disabled={logoUploading} />
        <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginTop: '0.35rem' }}>
          {logoUploading ? 'Uploading…' : 'Public URL stored on the organization. Uses Supabase bucket organization-branding.'}
        </p>
      </div>
      <div className="form-group">
        <label htmlFor="pc">Primary color (hex)</label>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            id="pc"
            type="color"
            value={/^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#2563eb'}
            onChange={(e) => setPrimaryColor(e.target.value)}
            style={{ width: 48, height: 36, padding: 0, border: 'none', cursor: 'pointer' }}
            aria-label="Color picker"
          />
          <input
            type="text"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#2563eb"
            pattern="^#[0-9A-Fa-f]{6}$"
            style={{ maxWidth: '120px', fontFamily: 'monospace' }}
          />
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              background: /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#ccc',
              border: '1px solid var(--color-border, #ddd)',
            }}
            aria-hidden
          />
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginTop: '0.35rem' }}>
          Drives accent buttons and links site-wide via CSS variables.
        </p>
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
      <button type="submit" className="btn btn-primary" disabled={loading || logoUploading}>
        {loading ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
