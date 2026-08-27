'use client';

import type { CSSProperties, ReactNode, Ref } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from '@astryxdesign/core/Table';
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
  /** Next-step affordance rendered inside the empty state (see KitEmptyState). */
  emptyAction?: ReactNode;
  onRowKeyClick?: (key: string) => void;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Astryx Table chrome for kit DataTable — accepts pre-rendered cell ReactNodes
 * from server parents so column `render` functions stay RSC-safe.
 */
export function KitTableShell({
  columns,
  rows,
  minWidth = 600,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRowKeyClick,
  className,
  style,
  ref,
  ...rest
}: KitTableShellProps) {
  const clickable = Boolean(onRowKeyClick);

  return (
    <div ref={ref} className={cx('wa-kit-table-wrap', className)} style={style} {...rest}>
      <div className="wa-overflow-x-auto">
        <Table density="compact" dividers="rows" hasHover={clickable} style={{ minWidth }}>
          <TableHeader>
            <TableRow isHeaderRow>
              {columns.map((c) => (
                <TableHeaderCell
                  key={c.key}
                  scope="col"
                  style={c.align === 'right' ? { textAlign: 'right' } : undefined}
                >
                  {c.header}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length || 1}>
                  <KitEmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
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
                  style={clickable ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map((c, i) => (
                    <TableCell
                      key={c.key}
                      // Right-aligned columns are numeric by convention here, and
                      // digits must share a width so figures stack cleanly down
                      // the column.
                      style={
                        c.align === 'right'
                          ? { textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
                          : undefined
                      }
                    >
                      {row.cells[i]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
