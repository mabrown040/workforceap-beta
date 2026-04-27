'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/portal/PageHeader';

export default function PrivacySettingsPage() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
      
      setMessage('Your data has been exported. Check your downloads.');
    } catch {
      setMessage('Could not export data. Try again.');
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
      setMessage('Account deleted. Signing out…');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch {
      setMessage('Could not delete account. Contact support.');
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
        title="Privacy & Data"
        subtitle="Manage your personal data and privacy preferences."
      />

      {message && (
        <div style={{
          padding: '0.875rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: message.includes('deleted') || message.includes('exported') 
            ? 'color-mix(in srgb, var(--color-green) 10%, transparent)'
            : 'color-mix(in srgb, var(--color-error) 10%, transparent)',
          border: `1px solid color-mix(in srgb, ${message.includes('deleted') || message.includes('exported') ? 'var(--color-green)' : 'var(--color-error)'} 20%, transparent)`,
          color: message.includes('deleted') || message.includes('exported') ? 'var(--color-green)' : 'var(--color-error)',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}>
          {message}
        </div>
      )}

      {/* Data Export */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Download Your Data</h2>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Get a copy of all your personal data stored on WorkforceAP. This includes your profile, applications, messages, course progress, and more.
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
          {exporting ? 'Preparing export…' : 'Export My Data'}
        </button>
      </section>

      {/* Consent Management */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Communication Preferences</h2>
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
            <div style={{ fontWeight: 600 }}>Program updates and opportunities</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.15rem' }}>
              Receive emails about new programs, workshops, and career opportunities.
            </div>
          </label>
        </div>
      </section>

      {/* Account Deletion */}
      <section>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--color-error)' }}>Delete Account</h2>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Permanently delete your account and anonymize your personal data. This action cannot be undone. Your anonymous activity data may be kept for program improvement purposes.
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
            Delete My Account
          </button>
        ) : (
          <div style={{
            padding: '1rem',
            background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)',
          }}>
            <p style={{ color: 'var(--color-error)', fontWeight: 700, margin: '0 0 0.75rem', fontSize: '0.9rem' }}>
              Are you sure? This will permanently delete your account.
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
                {deleting ? 'Deleting…' : 'Yes, Delete'}
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
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--outline-variant)' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
          Questions? Contact us at <a href="mailto:privacy@workforceap.org" style={{ color: 'var(--color-accent)' }}>privacy@workforceap.org</a>
        </p>
      </div>
    </div>
  );
}
