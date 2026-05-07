import type { ReactNode } from 'react';

/**
 * Data-table primitive for admin and portal pages.
 *
 * Replaces the repeated inline-style pattern:
 *
 *   <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
 *     <thead>
 *       <tr style={{ textAlign: 'left' }}>
 *         <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>...</th>
 *         ...
 *       </tr>
 *     </thead>
 *     <tbody>
 *       {rows.map((row) => (
 *         <tr key={row.id}>
 *           <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>...</td>
 *           ...
 *         </tr>
 *       ))}
 *     </tbody>
 *   </table>
 *
 * which currently appears in dozens of admin pages with subtly varying
 * paddings, font sizes, and overflow handling. By centralizing here, a
 * future style change (e.g. zebra striping, mobile card-collapse, sticky
 * headers) lives in one place.
 *
 * Generic over the row type so column `cell()` callbacks are properly
 * typed at the call site.
 */

export type DataTableColumn<TRow> = {
  /** Stable key for React reconciliation. */
  key: string;
  /** Header label. */
  header: ReactNode;
  /** Cell renderer. Receives the full row. */
  cell: (row: TRow, index: number) => ReactNode;
  /** Optional alignment for both header and cells. */
  align?: 'left' | 'right' | 'center';
  /** Optional `style.width` (use sparingly — flex is usually better). */
  width?: string | number;
  /** Hide on small viewports — column is dropped from render below 640px. */
  hideOnMobile?: boolean;
};

export type DataTableProps<TRow> = {
  columns: DataTableColumn<TRow>[];
  rows: TRow[];
  rowKey: (row: TRow, index: number) => string;
  /** Rendered when `rows.length === 0`. */
  emptyState?: ReactNode;
  /** Compact = smaller font + padding. Default = standard. */
  density?: 'standard' | 'compact';
  /** Wraps the table in a scroll container. Default true. */
  scrollX?: boolean;
  /** Optional className passthrough on the outer wrapper. */
  className?: string;
};

const PADDING_BY_DENSITY: Record<NonNullable<DataTableProps<unknown>['density']>, string> = {
  standard: '0.5rem 0.6rem',
  compact: '0.35rem 0.5rem',
};

const FONT_BY_DENSITY: Record<NonNullable<DataTableProps<unknown>['density']>, string> = {
  standard: '0.9rem',
  compact: '0.82rem',
};

export default function DataTable<TRow>({
  columns,
  rows,
  rowKey,
  emptyState,
  density = 'standard',
  scrollX = true,
  className,
}: DataTableProps<TRow>) {
  if (rows.length === 0 && emptyState !== undefined) {
    return <>{emptyState}</>;
  }

  const padding = PADDING_BY_DENSITY[density];
  const fontSize = FONT_BY_DENSITY[density];

  const tableElement = (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize }}>
      <thead>
        <tr style={{ textAlign: 'left' }}>
          {columns.map((col) => (
            <th
              key={col.key}
              style={{
                padding,
                borderBottom: '1px solid var(--outline-variant)',
                textAlign: col.align ?? 'left',
                width: col.width,
                whiteSpace: 'nowrap',
              }}
              className={col.hideOnMobile ? 'wa-hidden md:wa-table-cell' : undefined}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowKey(row, rowIndex)}>
            {columns.map((col) => (
              <td
                key={col.key}
                style={{
                  padding,
                  borderBottom: '1px solid var(--outline-variant)',
                  textAlign: col.align ?? 'left',
                  verticalAlign: 'top',
                }}
                className={col.hideOnMobile ? 'wa-hidden md:wa-table-cell' : undefined}
              >
                {col.cell(row, rowIndex)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (scrollX) {
    return (
      <div style={{ overflowX: 'auto' }} className={className}>
        {tableElement}
      </div>
    );
  }
  return <div className={className}>{tableElement}</div>;
}
