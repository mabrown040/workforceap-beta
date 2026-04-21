'use client';

import { useState } from 'react';
import AiResultRenderer from './AiResultRenderer';
import { formatPortalDate } from '@/lib/formatDate';

type Row = { id: string; toolType: string; inputSummary: string; output: string; createdAt: string };

export default function ToolHistoryPanelClient({ rows }: { rows: Row[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {rows.map((row) => {
        const isExpanded = expandedId === row.id;
        return (
          <div key={row.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: '0.75rem', background: 'var(--surface-container-low)', overflow: 'hidden' }}>
            <button
              type="button"
              aria-expanded={isExpanded} aria-label={isExpanded ? "Collapse details" : "Expand details"} onClick={() => setExpandedId(isExpanded ? null : row.id)}
              style={{ width: '100%', textAlign: 'left', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.inputSummary || 'Result'}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.1rem 0 0' }}>
                  {formatPortalDate(new Date(row.createdAt))}
                </p>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                expand_more
              </span>
            </button>
            {isExpanded && (
              <div style={{ padding: '0 0.875rem 0.875rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ paddingTop: '0.75rem' }}>
                  <AiResultRenderer
                    toolType={row.toolType}
                    output={row.output}
                    showCopy
                    compact
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
