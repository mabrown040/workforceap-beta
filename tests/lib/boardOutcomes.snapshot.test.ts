import { describe, expect, it } from 'vitest';
import { buildPlacementActivitySeries } from '@/lib/admin/boardOutcomes';

describe('buildPlacementActivitySeries', () => {
  it('aggregates placement_recorded member events by month in ascending order', () => {
    const rows = [
      { createdAt: new Date('2026-03-02T10:00:00Z') },
      { createdAt: new Date('2026-03-15T10:00:00Z') },
      { createdAt: new Date('2026-04-01T10:00:00Z') },
    ];

    expect(buildPlacementActivitySeries(rows)).toEqual([
      { month: '2026-03', monthLabel: 'Mar 2026', placementsRecorded: 2 },
      { month: '2026-04', monthLabel: 'Apr 2026', placementsRecorded: 1 },
    ]);
  });
});
