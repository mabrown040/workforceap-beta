import type { ReactNode } from 'react';
import { type KitBaseProps, type KitDataAttrs } from './base';
import { KitEmptyState } from './KitEmptyState';
import { KitTableShell } from './KitTableShell';

export interface Column<T> {
  /** Stable key for React. */
  key: string;
  header: string;
  /** Cell renderer; defaults to String(row[key]) when omitted. */
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right';
}

interface DataTableProps<T> extends KitBaseProps<HTMLDivElement>, KitDataAttrs {
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
  /** Next-step affordance rendered inside the empty state (see KitEmptyState). */
  emptyAction?: ReactNode;
}

/**
 * Dense roster table — Astryx `Table` chrome via `KitTableShell` (pre-rendered
 * cells keep server `render` columns RSC-safe). Mobile: scroll or stacked cards.
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
  emptyAction,
  className,
  style,
  ref,
  ...rest
}: DataTableProps<T>) {
  const cell = (col: Column<T>, row: T): ReactNode =>
    col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '');

  const shellColumns = columns.map((c) => ({ key: c.key, header: c.header, align: c.align }));
  const shellRows = rows.map((row) => ({
    key: rowKey(row),
    cells: columns.map((c) => cell(c, row)),
  }));

  const onRowKeyClick = onRowClick
    ? (key: string) => {
        const row = rows.find((r) => rowKey(r) === key);
        if (row) onRowClick(row);
      }
    : undefined;

  const single = mobile === 'scroll' || !cardRender;

  const tableEl = (
    <KitTableShell
      columns={shellColumns}
      rows={shellRows}
      minWidth={minWidth}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyAction={emptyAction}
      onRowKeyClick={onRowKeyClick}
      ref={single ? ref : undefined}
      className={single ? className : 'wa-kit-table-wrap'}
      style={single ? style : undefined}
      {...(single ? rest : {})}
    />
  );

  if (single || !cardRender) {
    return tableEl;
  }

  return (
    <div ref={ref} className={className} style={style} {...rest}>
      <div className="wa-hidden lg:wa-block">{tableEl}</div>
      <div className="lg:wa-hidden wa-space-y-2">
        {rows.length === 0 ? (
          <KitEmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
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
    </div>
  );
}
