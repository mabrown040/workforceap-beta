import { Fragment } from 'react';
import type { CSSProperties, ReactNode } from 'react';

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
  /** Applied to both `<th>` and `<td>` for this column (e.g. `members-col-md`). */
  columnClassName?: string;
  /** Pin column to the left on horizontal scroll (admin queues). */
  stickyLeft?: boolean;
};

export type DataTableProps<TRow> = {
  columns: DataTableColumn<TRow>[];
  rows: TRow[];
  rowKey: (row: TRow, index: number) => string;
  /** Rendered when `rows.length === 0`. */
  emptyState?: ReactNode;
  /** Compact = smaller font + padding. Default = standard. */
  density?: 'standard' | 'compact';
  /**
   * `portal` (default) — DataTable supplies cell padding and borders (inline).
   * `admin` — minimal inline cell chrome; use with `tableClassName` (`admin-table`, `dashboard-table`, coursera classes) so shared CSS controls padding, hover, and dark mode.
   */
  variant?: 'portal' | 'admin';
  /** Merged onto `<table>` (e.g. `admin-table`, `dashboard-table`). */
  tableClassName?: string;
  /** Per-row attributes for interactive rows (`data-clickable`, `onClick`, etc.). */
  getRowProps?: (row: TRow, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  /** Wraps the table in a scroll container. Default true. */
  scrollX?: boolean;
  /** Optional className passthrough on the outer wrapper. */
  className?: string;
  /**
   * When defined and returns non-nullish content, renders a full-width row below the main row
   * (`<td colSpan={columns.length}>...</td>`). Use for expandable detail rows (e.g. assessments).
   */
  renderSubRow?: (row: TRow, index: number) => ReactNode | null | undefined;
  /** Merged onto the sub-row `<td>` when `renderSubRow` returns content. */
  subRowTdStyle?: CSSProperties;
  subRowTdClassName?: string;
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
  variant = 'portal',
  tableClassName,
  getRowProps,
  scrollX = true,
  className,
  renderSubRow,
  subRowTdStyle,
  subRowTdClassName,
}: DataTableProps<TRow>) {
  if (rows.length === 0 && emptyState !== undefined) {
    return <>{emptyState}</>;
  }

  const padding = PADDING_BY_DENSITY[density];
  const fontSize = FONT_BY_DENSITY[density];
  const usePortalChrome = variant === 'portal';

  const tableElement = (
    <table
      className={tableClassName}
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        ...(usePortalChrome ? { fontSize } : {}),
      }}
    >
      <thead>
        <tr style={{ textAlign: 'left' }}>
          {columns.map((col) => (
            <th
              key={col.key}
              style={
                {
                  ...(usePortalChrome
                    ? {
                        padding,
                        borderBottom: '1px solid var(--outline-variant)',
                        textAlign: col.align ?? 'left',
                        width: col.width,
                        whiteSpace: 'nowrap',
                      }
                    : {
                        textAlign: col.align ?? 'left',
                        width: col.width,
                        whiteSpace: 'nowrap',
                      }),
                  ...(col.stickyLeft
                    ? {
                        position: 'sticky' as const,
                        left: 0,
                        zIndex: 2,
                        background: 'var(--surface-container, #1e2022)',
                      }
                    : {}),
                }
              }
              className={
                [col.hideOnMobile ? 'wa-hidden md:wa-table-cell' : undefined, col.columnClassName]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => {
          const rk = rowKey(row, rowIndex);
          const sub = renderSubRow?.(row, rowIndex);
          const showSub = sub != null && sub !== false;
          return (
            <Fragment key={rk}>
              <tr {...(getRowProps?.(row, rowIndex) ?? {})}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={
                      {
                        ...(usePortalChrome
                          ? {
                              padding,
                              borderBottom: '1px solid var(--outline-variant)',
                              textAlign: col.align ?? 'left',
                              verticalAlign: 'top',
                            }
                          : {
                              textAlign: col.align ?? 'left',
                              verticalAlign: 'top',
                            }),
                        ...(col.stickyLeft
                          ? {
                              position: 'sticky' as const,
                              left: 0,
                              zIndex: 1,
                              background: 'var(--surface-container-low, #1a1c1e)',
                            }
                          : {}),
                      }
                    }
                    className={
                      [col.hideOnMobile ? 'wa-hidden md:wa-table-cell' : undefined, col.columnClassName]
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                  >
                    {col.cell(row, rowIndex)}
                  </td>
                ))}
              </tr>
              {showSub ? (
                <tr className="data-table-subrow">
                  <td
                    colSpan={columns.length}
                    style={{
                      ...(usePortalChrome
                        ? {
                            padding,
                            borderBottom: '1px solid var(--outline-variant)',
                            verticalAlign: 'top',
                          }
                        : { verticalAlign: 'top' }),
                      ...subRowTdStyle,
                    }}
                    className={subRowTdClassName}
                  >
                    {sub}
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
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
