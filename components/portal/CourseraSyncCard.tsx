'use client';

import { useState } from 'react';

type SyncResult = {
  syncedAt: string;
  progress: {
    totalSkillsets: number;
    completedSkillsets: number;
    averagePercent: number;
    elements: Array<{
      skillsetId: string;
      skillsetName: string;
      progressPercent: number;
    }>;
  };
};

export default function CourseraSyncCard({ enabled }: { enabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handleSync() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/member/coursera/sync', { method: 'POST' });
      const payload = (await response.json()) as Record<string, any>;
      if (!response.ok) {
        const detail = typeof payload.error === 'string' ? payload.error : 'Sync failed';
        throw new Error(detail);
      }
      setResult(payload as SyncResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="coursera-callout" style={{ marginBottom: 0 }}>
      <h4 className="coursera-callout__title">Course progress sync</h4>
      <p className="coursera-callout__text" style={{ marginBottom: '0.85rem' }}>
        {enabled
          ? 'Sync your Coursera progress to see updated course completions here in the portal.'
          : 'Progress sync is almost ready. Once the final connection is set up, this button will pull in your course progress.'}
      </p>

      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={handleSync}
        disabled={!enabled || loading}
        style={{ marginBottom: result || error ? '0.85rem' : 0 }}
      >
        {loading ? 'Checking sync…' : 'Sync progress'}
      </button>

      {error ? (
        <p className="coursera-footnote" style={{ color: 'var(--color-accent)', marginTop: 0 }}>
          {error}
        </p>
      ) : null}

      {result ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <p className="coursera-footnote" style={{ marginTop: 0 }}>
            Last checked {new Date(result.syncedAt).toLocaleString()} · {result.progress.completedSkillsets}/
            {result.progress.totalSkillsets} skillsets complete · {result.progress.averagePercent}% avg.
          </p>
          {result.progress.elements.slice(0, 4).map((item) => (
            <div
              key={item.skillsetId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '0.75rem',
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid var(--outline-variant)',
              }}
            >
              <span style={{ fontWeight: 600 }}>{item.skillsetName}</span>
              <span style={{ color: 'var(--color-on-surface-variant)' }}>{item.progressPercent}%</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
