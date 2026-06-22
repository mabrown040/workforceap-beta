import type { ReactNode } from 'react';

export interface Column<T> {
  /** Stable key for React. */
  key: string;
  header: string;
  /** Cell renderer; defaults to String(row[key]) when omitted. */
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /**
   * Mobile strategy:
   *  - 'cards'  → below lg, render `cardRender(row)` as a stacked card (no squish)
   *  - 'scroll' → keep the table, allow horizontal scroll
   */
  mobile?: 'cards' | 'scroll';
  cardRender?: (row: T) => ReactNode;
  minWidth?: number;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Dense, token-styled table for rosters / CSV / placements / jobs. The linchpin
 * for "data views = Dense" AND "mobile works": on mobile it either scrolls or
 * collapses each row to a card (the pattern proven in the mobile-proof mockup).
 * Mockup: admin students/jobs/placements + mobile-proof phone 3.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  mobile = 'scroll',
  cardRender,
  minWidth = 600,
  onRowClick,
  emptyTitle = 'No rows yet',
  emptyDescription,
}: DataTableProps<T>) {
  const cell = (col: Column<T>, row: T): ReactNode =>
    col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '');

  const tableEl = (
    <div className="wa-kit-table-wrap">
      <div className="wa-overflow-x-auto">
        <table className="wa-kit-table" style={{ minWidth }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" style={c.align === 'right' ? { textAlign: 'right' } : undefined}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length || 1}>
                  <div className="wa-kit-card wa-kit-card--sm" style={{ margin: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--wa-text)' }}>{emptyTitle}</div>
                    {emptyDescription ? (
                      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--wa-muted)' }}>
                        {emptyDescription}
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={onRowClick ? 'wa-kit-focus' : undefined}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} style={c.align === 'right' ? { textAlign: 'right' } : undefined}>
                      {cell(c, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (mobile === 'scroll' || !cardRender) {
    return tableEl;
  }

  // 'cards': table on desktop, stacked cards on mobile.
  return (
    <>
      <div className="wa-hidden lg:wa-block">{tableEl}</div>
      <div className="lg:wa-hidden wa-space-y-2">
        {rows.length === 0 ? (
          <div className="wa-kit-card wa-kit-card--sm">
            <div style={{ fontWeight: 700, color: 'var(--wa-text)' }}>{emptyTitle}</div>
            {emptyDescription ? (
              <div style={{ marginTop: 4, fontSize: 13, color: 'var(--wa-muted)' }}>
                {emptyDescription}
              </div>
            ) : null}
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={onRowClick ? 'wa-kit-focus' : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {cardRender(row)}
            </div>
          ))
        )}
      </div>
    </>
  );
}
