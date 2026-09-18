'use client';

export type KitSortDirection = 'asc' | 'desc';

interface KitSortHeaderProps {
  label: string;
  columnKey: string;
  active: boolean;
  direction: KitSortDirection;
  onSort: (key: string) => void;
}

/**
 * Clickable column header for kit DataTable — sets `aria-sort` on the parent
 * `<th>` via the caller; this button carries the visible label + direction cue.
 */
export function KitSortHeader({
  label,
  columnKey,
  active,
  direction,
  onSort,
}: KitSortHeaderProps) {
  return (
    <button
      type="button"
      className="wa-kit-sort-header"
      onClick={() => onSort(columnKey)}
      aria-label={`Sort by ${label}${active ? (direction === 'asc' ? ', ascending' : ', descending') : ''}`}
    >
      <span>{label}</span>
      <span className="wa-kit-sort-header__indicator" aria-hidden="true">
        {active ? (direction === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  );
}
