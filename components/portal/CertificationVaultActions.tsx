'use client';

import { useCallback, useRef, useState } from 'react';

export type CertRow = {
  id: string;
  certName: string;
  earnedAt: string;
};

function iconForCertName(name: string): string {
  const icons = ['workspace_premium', 'verified', 'school', 'security', 'cloud', 'health_and_safety'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % 997;
  return icons[h % icons.length];
}

export function CertificationViewButton({
  certName,
  earnedAtLabel,
  variant = 'mobile',
}: {
  certName: string;
  earnedAtLabel: string;
  variant?: 'mobile' | 'desktop';
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  const btnStyle =
    variant === 'mobile'
      ? {
          background: 'var(--color-accent)',
          color: '#fff',
          border: 'none',
          borderRadius: '0.5rem',
          padding: '0.375rem 0.75rem',
          fontSize: '0.8125rem',
          fontWeight: 600,
          whiteSpace: 'nowrap' as const,
          cursor: 'pointer',
          flexShrink: 0,
        }
      : {
          background: 'var(--surface-container-high)',
          color: 'var(--color-accent)',
          border: '1px solid var(--outline-variant)',
          borderRadius: '0.5rem',
          padding: '0.35rem 0.75rem',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          cursor: 'pointer',
        };

  return (
    <>
      <button type="button" onClick={open} style={btnStyle}>
        View
      </button>
      <dialog
        ref={dialogRef}
        style={{
          border: 'none',
          borderRadius: '0.875rem',
          padding: '1.25rem',
          maxWidth: 'min(100vw - 2rem, 22rem)',
          boxShadow: 'var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.15))',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', fontWeight: 700 }}>{certName}</h3>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
          Earned: {earnedAtLabel}
        </p>
        <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
          This is your verification record in WorkforceAP. Official certificates are issued by the certifying body; keep any PDFs they provide.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={close}
        >
          Close
        </button>
      </dialog>
    </>
  );
}

export function CertificationEarnedRowMobile({
  certName,
  earnedAt,
}: {
  certName: string;
  earnedAt: Date;
}) {
  const icon = iconForCertName(certName);
  const earnedLabel = earnedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div
      style={{
        background: 'var(--surface-container)',
        borderRadius: '0.875rem',
        padding: '0.875rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
      }}
    >
      <div
        style={{
          background: 'rgba(74,155,79,0.12)',
          borderRadius: '0.625rem',
          padding: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '1.375rem', color: 'var(--color-green)', fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.9375rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {certName}
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>Recorded · {earnedLabel}</div>
      </div>
      <CertificationViewButton certName={certName} earnedAtLabel={earnedLabel} variant="mobile" />
    </div>
  );
}

export function DownloadAllCertificatesButton({ certs }: { certs: CertRow[] }) {
  const [busy, setBusy] = useState(false);

  const run = useCallback(() => {
    if (certs.length === 0) return;
    setBusy(true);
    try {
      const lines = ['Certificate name,Earned date (ISO)', ...certs.map((c) => `"${c.certName.replace(/"/g, '""')}",${c.earnedAt}`)];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workforceap-certifications-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }, [certs]);

  const disabled = certs.length === 0 || busy;

  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={disabled}
      title={certs.length === 0 ? 'Add earned certificates from your roadmap first' : 'Download a CSV list of your earned certificates'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        alignSelf: 'flex-start',
        padding: '0.6rem 1.25rem',
        fontSize: 'var(--font-size-sm)',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={run}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
        download
      </span>
      {busy ? 'Preparing…' : 'Download list (CSV)'}
    </button>
  );
}
