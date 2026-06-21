import type { ReactNode } from 'react';
import type { KitTone } from './tokens';

export interface KanbanCardData {
  id: string;
  title: string;
  meta?: string;
}

export interface KanbanColumnData {
  label: string;
  count: number;
  tone?: KitTone;
  cards: KanbanCardData[];
}

const TONE_C: Record<KitTone, string> = {
  ok: 'var(--wa-success)',
  warn: 'var(--wa-gold)',
  alert: 'var(--wa-accent)',
  info: 'var(--wa-info)',
  muted: 'var(--wa-muted)',
};

/**
 * Employer candidate pipeline. Columns scroll horizontally on mobile.
 * Mockup: employer pipeline (Kanban).
 */
export function KanbanBoard({ columns }: { columns: KanbanColumnData[] }) {
  return (
    <div className="wa-overflow-x-auto">
      <div style={{ display: 'flex', gap: 12, minWidth: 'min-content' }}>
        {columns.map((col) => (
          <div key={col.label} className="wa-kit-card wa-kit-card--sm" style={{ minWidth: 200, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{col.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, fontWeight: 800, color: TONE_C[col.tone ?? 'muted'] }}>{col.count}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.cards.map((c) => (
                <div key={c.id} style={{ padding: 10, borderRadius: 'var(--wa-radius-sm)', background: 'var(--wa-bg)', border: '1px solid var(--wa-border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 11 }}>{c.title}</div>
                  {c.meta ? <div style={{ fontSize: 10, color: 'var(--wa-muted)' }}>{c.meta}</div> : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanColumnHeader({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700 }}>{children}</div>;
}
