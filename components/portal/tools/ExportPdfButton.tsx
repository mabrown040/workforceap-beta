'use client';

import { useState } from 'react';
import { } from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';

const GENERIC_ERROR = "Couldn't generate the PDF — please try again. If this keeps happening, contact support.";

export default function ExportPdfButton({
  text,
  title,
  toolName,
  label = 'Download PDF'}: {
  text: string;
  title?: string;
  toolName?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title, toolName })});
      if (!res.ok) {
        setError(GENERIC_ERROR);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'workforceap-export').replace(/[^a-zA-Z0-9-_ ]/g, '')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={handleExport}
        disabled={loading || !text}
        aria-busy={loading}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
      >
        {loading ? (
          <PortalInlineSpinner size={14} />
        ) : (
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">picture_as_pdf</span>
        )}
        <span aria-live="polite">{loading ? 'Saving…' : label}</span>
      </button>
      {error ? (
        <span role="alert" style={{ color: 'var(--color-error, #b91c1c)', fontSize: '0.75rem', lineHeight: 1.3 }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
