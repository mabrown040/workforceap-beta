'use client';

import { useState } from 'react';

type Props = {
  resourceId: string;
  resourceTitle: string;
  onDownloaded?: () => void;
};

export default function ResourceDownloadButton({ resourceId, resourceTitle, onDownloaded }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/member/resources/${resourceId}/download`, { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resourceTitle.replace(/[^a-z0-9-]/gi, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await fetch(`/api/member/resources/${resourceId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download' }),
        credentials: 'include',
      });
      onDownloaded?.();
    } catch {
      // Previously failed silently — the button just went back to "Download"
      // with no sign anything went wrong.
      setError("Couldn't download this file — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.375rem' }}>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={handleDownload}
        disabled={loading}
      >
        {loading ? 'Downloading…' : 'Download'}
      </button>
      {error && (
        <p role="alert" style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-error, #dc2626)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
