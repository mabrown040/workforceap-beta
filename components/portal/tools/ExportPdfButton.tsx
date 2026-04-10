'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function ExportPdfButton({
  text,
  title,
  toolName,
  label = 'Download PDF',
}: {
  text: string;
  title?: string;
  toolName?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title, toolName }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'workforceap-export').replace(/[^a-zA-Z0-9-_ ]/g, '')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      onClick={handleExport}
      disabled={loading || !text}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
    >
      {loading ? (
        <Loader2 size={14} className="ai-tool-submit-spinner" />
      ) : (
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">picture_as_pdf</span>
      )}
      {label}
    </button>
  );
}
