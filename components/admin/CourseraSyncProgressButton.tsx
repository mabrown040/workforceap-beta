'use client';

import { useState } from 'react';

type SyncResult = {
  xapi: { scanned: number; replayed: number; completionsEmitted: number };
  rollups: { run: number; errors: number; total: number };
};

export default function CourseraSyncProgressButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/coursera/sync-progress', { method: 'POST' });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json() as SyncResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={handleSync}
        disabled={running}
        style={{
          padding: '0.55rem 0.9rem',
          borderRadius: '0.65rem',
          border: '1px solid var(--color-accent)',
          background: running ? 'var(--surface-container)' : 'var(--color-accent)',
          color: running ? 'var(--color-accent)' : '#fff',
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: running ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {running ? 'Syncing…' : 'Sync training progress →'}
      </button>
      {result && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
          ✓ xAPI: {result.xapi.replayed} replayed, {result.xapi.completionsEmitted} completions
          <br />
          ✓ Rollups: {result.rollups.run}/{result.rollups.total} members updated
          {result.rollups.errors > 0 && ` (${result.rollups.errors} errors)`}
        </div>
      )}
      {error && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-error, #dc2626)' }}>
          Error: {error}
        </div>
      )}
    </div>
  );
}
