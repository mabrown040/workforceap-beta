'use client';

import { useState, useRef } from 'react';

type Props = { memberId: string; onUploaded: () => void };

export default function AdminResumeUpload({ memberId, onUploaded }: Props) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('resumeOriginal', file);
      const res = await fetch(`/api/admin/members/${encodeURIComponent(memberId)}/upload-resume`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? 'Upload failed');
      }
      setOpen(false);
      if (fileRef.current) fileRef.current.value = '';
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setOpen(true)}
        style={{ marginTop: '0.5rem' }}
      >
        Upload resume for member
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 360 }}>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx"
        required
        style={{ fontSize: '0.9rem' }}
      />
      {error && <p style={{ margin: 0, fontSize: '0.85rem', color: '#b91c1c' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={uploading} aria-busy={uploading}>
          <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {uploading ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }} aria-hidden="true">progress_activity</span>
                Uploading…
              </>
            ) : (
              'Upload'
            )}
          </span>
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => { setOpen(false); setError(null); }} disabled={uploading}>
          Cancel
        </button>
      </div>
    </form>
  );
}
