'use client';

import { useState } from 'react';

type Props = {
  resourceId: string;
  resourceTitle: string;
  onDownloaded?: () => void;
};

export default function ResourceDownloadButton({ resourceId, resourceTitle, onDownloaded }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
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
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      onClick={handleDownload}
      disabled={loading}
    >
      {loading ? 'Downloading…' : 'Download'}
    </button>
  );
}
