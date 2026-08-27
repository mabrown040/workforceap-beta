'use client';

import type { CSSProperties, ReactNode, Ref } from 'react';
import { cx, type KitDataAttrs } from './base';
import { KitEmptyState } from './KitEmptyState';

export type KitTableShellColumn = {
  key: string;
  header: string;
  align?: 'left' | 'right';
};

export type KitTableShellRow = {
  key: string;
  cells: ReactNode[];
};

interface KitTableShellProps extends KitDataAttrs {
  columns: KitTableShellColumn[];
  rows: KitTableShellRow[];
  minWidth?: number;
  emptyTitle: string;
  emptyDescription?: string;
  onRowKeyClick?: (key: string) => void;
  /** Override surface-driven density. Warm → balanced, dense → compact. */
  density?: 'compact' | 'balanced' | 'spacious';
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Native table chrome for kit DataTable — `.wa-kit-table` on `--wa-*`.
 * Accepts pre-rendered cell ReactNodes from server parents so column `render`
 * functions stay RSC-safe. Density follows the nearest DesignSurface via
 * `[data-surface]`; pass `density` to override.
 */
export function KitTableShell({
  columns,
  rows,
  minWidth = 600,
  emptyTitle,
  emptyDescription,
  onRowKeyClick,
  density,
  className,
  style,
  ref,
  ...rest
}: KitTableShellProps) {
  const clickable = Boolean(onRowKeyClick);

  return (
    <div ref={ref} className={cx('wa-kit-table-wrap', className)} style={style} {...rest}>
      <div className="wa-overflow-x-auto">
        <table
          className={cx('wa-kit-table', clickable && 'wa-kit-table--clickable')}
          data-density={density}
          style={{ minWidth }}
        >
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  style={c.align === 'right' ? { textAlign: 'right' } : undefined}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length || 1}>
                  <KitEmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.key}
                  onClick={clickable ? () => onRowKeyClick?.(row.key) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowKeyClick?.(row.key);
                          }
                        }
                      : undefined
                  }
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  className={clickable ? 'wa-kit-focus' : undefined}
                >
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      style={c.align === 'right' ? { textAlign: 'right' } : undefined}
                    >
                      {row.cells[i]}
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
}
