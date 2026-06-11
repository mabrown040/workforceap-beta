'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import PageHeader from '@/components/portal/PageHeader';

type StatusMessage = { kind: 'success' | 'error'; text: string };

export default function PrivacySettingsPage() {
  const t = useTranslations('dashboard.privacy');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [consentLoaded, setConsentLoaded] = useState(false);

  useEffect(() => {
    // Load current consent state
    fetch('/api/gdpr/consent')
      .then((r) => r.json())
      .then((data) => {
        setConsentMarketing(data.consentCommunications ?? false);
        setConsentLoaded(true);
      })
      .catch(() => setConsentLoaded(true));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/gdpr/export');
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workforceap-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ kind: 'success', text: t('exportSuccess') });
    } catch {
      setMessage({ kind: 'error', text: t('exportError') });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/gdpr/delete', { method: 'POST' });
      if (!res.ok) throw new Error('Delete failed');
      setMessage({ kind: 'success', text: t('deleteSuccess') });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch {
      setMessage({ kind: 'error', text: t('deleteError') });
      setDeleting(false);
    }
  };

  const updateConsent = async (value: boolean) => {
    setConsentMarketing(value);
    try {
      await fetch('/api/gdpr/consent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentCommunications: value }),
      });
    } catch {
      // Silent fail
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 720, margin: '0 auto' }}>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {message && (
        <div role="status" style={{
          padding: '0.875rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: message.kind === 'success'
            ? 'color-mix(in srgb, var(--color-green) 10%, transparent)'
            : 'color-mix(in srgb, var(--color-error) 10%, transparent)',
          border: `1px solid color-mix(in srgb, ${message.kind === 'success' ? 'var(--color-green)' : 'var(--color-error)'} 20%, transparent)`,
          color: message.kind === 'success' ? 'var(--color-green)' : 'var(--color-error)',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}>
          {message.text}
        </div>
      )}

      {/* Data Export */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{t('exportHeading')}</h2>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
          {t('exportBody')}
        </p>
        <button type="button"
          onClick={handleExport}
          disabled={exporting}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: exporting ? 'not-allowed' : 'pointer',
            opacity: exporting ? 0.7 : 1,
          }}
        >
          {exporting ? t('exportPreparing') : t('exportButton')}
        </button>
      </section>

      {/* Consent Management */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{t('consentHeading')}</h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem',
          background: 'var(--surface-container)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--outline-variant)',
        }}>
          <input
            type="checkbox"
            id="consent-marketing"
            checked={consentMarketing}
            onChange={(e) => updateConsent(e.target.checked)}
            disabled={!consentLoaded}
            style={{ width: 20, height: 20, accentColor: 'var(--color-accent)' }}
          />
          <label htmlFor="consent-marketing" style={{ flex: 1, fontSize: '0.9rem', cursor: 'pointer' }}>
            <div style={{ fontWeight: 600 }}>{t('consentLabel')}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.15rem' }}>
              {t('consentDescription')}
            </div>
          </label>
        </div>
      </section>

      {/* Account Deletion */}
      <section>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--color-error)' }}>{t('deleteHeading')}</h2>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
          {t('deleteBody')}
        </p>

        {!showDeleteConfirm ? (
          <button type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              color: 'var(--color-error)',
              border: '2px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            {t('deleteButton')}
          </button>
        ) : (
          <div style={{
            padding: '1rem',
            background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)',
          }}>
            <p style={{ color: 'var(--color-error)', fontWeight: 700, margin: '0 0 0.75rem', fontSize: '0.9rem' }}>
              {t('deleteConfirmPrompt')}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'var(--color-error)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? t('deleteDeleting') : t('deleteConfirmYes')}
              </button>
              <button type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'var(--surface-container-high)',
                  color: 'var(--color-on-surface)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                {t('deleteCancel')}
              </button>
            </div>
          </div>
        )}
      </section>

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--outline-variant)' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
          {t('questionsContact')} <a href="mailto:privacy@workforceap.org" style={{ color: 'var(--color-accent)' }}>privacy@workforceap.org</a>
        </p>
      </div>
    </div>
  );
}
