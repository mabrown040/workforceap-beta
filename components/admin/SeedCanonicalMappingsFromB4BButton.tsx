'use client';

/**
 * Companion to `SeedCanonicalMappingsButton` that uses the live B4B
 * program directory instead of the local `courses` table. Resolves the
 * "11 catalog programs have zero canonical mappings" gap by pulling
 * Coursera's own program → course tree.
 *
 * See `lib/coursera/seedCanonicalMappingsFromB4B.ts`.
 */
import { useState } from 'react';

type ProgramResult = {
  canonicalProgramSlug: string | null;
  b4bProgramId: string;
  b4bProgramName: string;
  matchKind: 'manualId' | 'name' | 'unmatched';
  scanned: number;
  created: number;
  updated: number;
  skippedNoCourseId: number;
};

type Summary = {
  programsScanned: number;
  programsMatched: number;
  programsUnmatched: number;
  totalCreated: number;
  totalUpdated: number;
  perProgram: ProgramResult[];
};

const CONFIRM_PROMPT =
  'This will pull the live B4B program directory and upsert canonical mappings for every matched program. Continue?';

export default function SeedCanonicalMappingsFromB4BButton() {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (typeof window !== 'undefined' && !window.confirm(CONFIRM_PROMPT)) return;
    setRunning(true);
    setSummary(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/coursera/seed-canonical-mappings-from-b4b', {
        method: 'POST',
      });
      const json = (await res.json().catch(() => null)) as
        | (Summary & { error?: string })
        | { error?: string }
        | null;
      if (!res.ok) {
        const msg =
          (json && 'error' in json && typeof json.error === 'string' && json.error) ||
          `Server error ${res.status}`;
        throw new Error(msg);
      }
      if (
        !json ||
        typeof (json as Summary).programsScanned !== 'number' ||
        !Array.isArray((json as Summary).perProgram)
      ) {
        throw new Error('Malformed server response');
      }
      setSummary(json as Summary);
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
        onClick={handleClick}
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
          alignSelf: 'flex-start',
        }}
      >
        {running ? 'Pulling from B4B…' : 'Seed mappings from live B4B'}
      </button>
      {summary ? (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
          Scanned {summary.programsScanned} B4B programs — matched{' '}
          <strong>{summary.programsMatched}</strong> to catalog,{' '}
          <strong>{summary.programsUnmatched}</strong> unmatched. Created{' '}
          <strong>{summary.totalCreated}</strong> new mapping{summary.totalCreated === 1 ? '' : 's'}, refreshed{' '}
          <strong>{summary.totalUpdated}</strong>.
          {summary.perProgram.some((r) => r.matchKind === 'unmatched') ? (
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer' }}>Unmatched B4B programs (review manually)</summary>
              <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.25rem' }}>
                {summary.perProgram
                  .filter((r) => r.matchKind === 'unmatched')
                  .map((r) => (
                    <li key={r.b4bProgramId}>
                      <code>{r.b4bProgramId}</code> — {r.b4bProgramName} ({r.scanned} courses)
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-error, #dc2626)' }}>Error: {error}</div>
      ) : null}
    </div>
  );
}
