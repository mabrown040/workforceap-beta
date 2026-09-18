'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { KitSortHeader, type KitSortDirection } from '@/components/portal/kit/KitSortHeader';

export type { KitSortDirection };

export function ariaSortForColumn<T extends string>(
  key: T,
  sortKey: T,
  sortDirection: KitSortDirection,
): 'ascending' | 'descending' | 'none' {
  if (key !== sortKey) return 'none';
  return sortDirection === 'asc' ? 'ascending' : 'descending';
}

/**
 * Shared click-to-sort state for kit DataTable rosters. Text columns default to
 * ascending on first click; numeric/status columns default to descending.
 */
export function useKitTableSort<T extends string>(
  defaultKey: T,
  defaultDirection: KitSortDirection,
  textKeys: readonly T[] = [],
) {
  const [sortKey, setSortKey] = useState<T>(defaultKey);
  const [sortDirection, setSortDirection] = useState<KitSortDirection>(defaultDirection);

  const onSortColumn = useCallback(
    (key: T) => {
      if (sortKey === key) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return;
      }
      setSortKey(key);
      setSortDirection(textKeys.includes(key) ? 'asc' : 'desc');
    },
    [sortKey, textKeys],
  );

  const sortHeader = useCallback(
    (key: T, label: string): ReactNode => (
      <KitSortHeader
        label={label}
        columnKey={key}
        active={sortKey === key}
        direction={sortDirection}
        onSort={(columnKey) => onSortColumn(columnKey as T)}
      />
    ),
    [sortKey, sortDirection, onSortColumn],
  );

  return { sortKey, sortDirection, onSortColumn, sortHeader, setSortKey, setSortDirection };
}
