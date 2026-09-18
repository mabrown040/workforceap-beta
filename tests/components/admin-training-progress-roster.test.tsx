import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Swap the design-system primitives for plain elements so these tests assert
// the roster's filter/sort behaviour rather than Astryx internals.
vi.mock('@astryxdesign/core/Card', () => ({
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@astryxdesign/core/Button', () => ({
  Button: ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{label}</button>
  ),
}));
vi.mock('@astryxdesign/core/Token', () => ({
  Token: ({ label }: { label: string }) => <span>{label}</span>,
}));
vi.mock('@astryxdesign/core/Link', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

import TrainingProgressRoster from '@/components/admin/TrainingProgressRoster';
import type { TrainingRow } from '@/components/portal/kit/pages/admin-subviews/TrainingProgressKit';

afterEach(cleanup);

const IT = 'IT Support Professional Certificate (IBM)';
const AI = 'AI and Software Developer Professional Certificate';

const ROWS: TrainingRow[] = [
  {
    id: 'u1:it', student: 'Noel Gonzalez', program: IT,
    modulesDone: 2, modulesTotal: 10, percentComplete: 22, pace: 'Behind',
    courseraGrade: 85.4, inWap: true, noProgram: true,
  },
  {
    id: 'u2:ai', student: 'Joseph David Ring', program: AI,
    modulesDone: 2, modulesTotal: 17, percentComplete: 16, pace: 'Behind',
    courseraGrade: 86.8, inWap: true, noProgram: true,
  },
  {
    id: 'u3:it', student: 'Avery Stone', program: IT,
    modulesDone: 9, modulesTotal: 10, percentComplete: 91, pace: 'Ahead',
    courseraGrade: null, inWap: true,
  },
  {
    id: 'u4:it', student: 'Dana Reed', program: IT,
    modulesDone: 0, modulesTotal: 10, percentComplete: 0, pace: 'Stalled',
    courseraGrade: null, inWap: true,
  },
  {
    id: 'coursera:zed@example.com', student: 'Zed Coursera', program: 'Coursera activity',
    modulesDone: 0, modulesTotal: 3, percentComplete: 4, pace: 'Stalled', inWap: false,
  },
];

/**
 * DataTable renders the table AND the mobile cards, hiding one with CSS, so
 * every learner's name is in the DOM twice. Reading order off the table keeps
 * these assertions unambiguous.
 *
 * The student cell holds the name in its own nested span alongside any
 * "No program" / "Unmatched" badge, so read that span rather than the cell's
 * full text.
 */
function studentsInTable(): string[] {
  const table = document.querySelector('table');
  if (!table) return [];
  return Array.from(table.querySelectorAll('tbody tr'))
    .map((row) => row.querySelector('td span span')?.textContent?.trim() ?? '')
    // An empty roster still renders one row — the empty state — which carries
    // no student-name span.
    .filter((student) => student !== '');
}

/**
 * KPI value sits in a sibling `.wa-kit-stat-value`, not inside the label. The
 * lookup is scoped to the stat label because "Behind" and "Stalled" are also
 * pace badges on rows and options in the Pace select.
 */
function kpi(label: string): string {
  const labelNode = Array.from(document.querySelectorAll('.wa-kit-stat-label')).find(
    (node) => node.textContent?.trim() === label,
  );
  return labelNode?.parentElement?.querySelector('.wa-kit-stat-value')?.textContent?.trim() ?? '';
}

function renderRoster(props: Partial<React.ComponentProps<typeof TrainingProgressRoster>> = {}) {
  return render(<TrainingProgressRoster rows={ROWS} {...props} />);
}

describe('admin training roster — sorting', () => {
  it('opens most complete first', () => {
    renderRoster();
    expect(studentsInTable()).toEqual([
      'Avery Stone', 'Noel Gonzalez', 'Joseph David Ring', 'Zed Coursera', 'Dana Reed',
    ]);
  });

  it('re-sorts by student name when the sort key changes', () => {
    renderRoster();
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'student' } });
    fireEvent.change(screen.getByLabelText('Order'), { target: { value: 'asc' } });
    expect(studentsInTable()).toEqual([
      'Avery Stone', 'Dana Reed', 'Joseph David Ring', 'Noel Gonzalez', 'Zed Coursera',
    ]);
  });

  it('reverses when the order flips', () => {
    renderRoster();
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'student' } });
    fireEvent.change(screen.getByLabelText('Order'), { target: { value: 'desc' } });
    expect(studentsInTable()[0]).toBe('Zed Coursera');
  });

  it('orders pace by health, not alphabetically', () => {
    renderRoster();
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'pace' } });
    fireEvent.change(screen.getByLabelText('Order'), { target: { value: 'asc' } });
    expect(studentsInTable()[0]).toBe('Avery Stone');
  });
});

describe('admin training roster — filtering', () => {
  it('narrows to a search match', () => {
    renderRoster();
    fireEvent.change(screen.getByLabelText('Search learners'), { target: { value: 'gonzalez' } });
    expect(studentsInTable()).toEqual(['Noel Gonzalez']);
  });

  it('filters by pace', () => {
    renderRoster();
    fireEvent.change(screen.getByLabelText('Pace'), { target: { value: 'Stalled' } });
    expect(studentsInTable()).toEqual(['Zed Coursera', 'Dana Reed']);
  });

  it('filters by program', () => {
    renderRoster();
    fireEvent.change(screen.getByLabelText('Program'), { target: { value: AI } });
    expect(studentsInTable()).toEqual(['Joseph David Ring']);
  });

  it('separates unmatched Coursera identities from members lacking a program', () => {
    renderRoster();
    fireEvent.change(screen.getByLabelText('Roster'), { target: { value: 'unmatched' } });
    expect(studentsInTable()).toEqual(['Zed Coursera']);

    fireEvent.change(screen.getByLabelText('Roster'), { target: { value: 'no-program' } });
    expect(studentsInTable()).toEqual(['Noel Gonzalez', 'Joseph David Ring']);
  });

  it('lists only the programs actually present, once each', () => {
    renderRoster();
    const options = within(screen.getByLabelText('Program'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual(['All programs', AI, 'Coursera activity', IT]);
  });

  it('shows an empty state rather than a stale table when nothing matches', () => {
    renderRoster();
    fireEvent.change(screen.getByLabelText('Search learners'), { target: { value: 'nobody' } });
    expect(studentsInTable()).toEqual([]);
    expect(screen.getAllByText('No training progress yet').length).toBeGreaterThan(0);
  });

  it('clears every filter at once', () => {
    renderRoster();
    fireEvent.change(screen.getByLabelText('Search learners'), { target: { value: 'gonzalez' } });
    fireEvent.change(screen.getByLabelText('Pace'), { target: { value: 'Behind' } });
    expect(studentsInTable()).toEqual(['Noel Gonzalez']);

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(studentsInTable()).toHaveLength(5);
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });
});

describe('admin training roster — honest counts', () => {
  it('recomputes the KPI strip from the filtered rows', () => {
    // A filtered table above unfiltered totals reads as though the totals were
    // the filter's result, which is the accuracy problem this page had.
    renderRoster();
    expect(kpi('On Track')).toBe('1');
    expect(kpi('Behind')).toBe('2');
    expect(kpi('Stalled')).toBe('2');

    fireEvent.change(screen.getByLabelText('Pace'), { target: { value: 'Behind' } });
    expect(kpi('On Track')).toBe('0');
    expect(kpi('Behind')).toBe('2');
    expect(kpi('Stalled')).toBe('0');
    // (22 + 16) / 2 = 19
    expect(kpi('Avg %')).toBe('19%');
  });

  it('says how many of the roster is showing once a filter is on', () => {
    renderRoster();
    expect(screen.getByTestId('training-roster-count').textContent)
      .toContain('Showing all 5 learners');

    fireEvent.change(screen.getByLabelText('Pace'), { target: { value: 'Behind' } });
    expect(screen.getByTestId('training-roster-count').textContent)
      .toContain('Showing 2 of 5 learners');
  });

  it('surfaces the population the roster actually covers', () => {
    // 128 members exist in production but only those with a program or
    // Coursera activity produce a row, and the header says "all members".
    renderRoster({
      coverageLabel: '47 of 128 members have training activity · 81 not in a program or course yet',
      showingLabel: 'Showing first 128 of 128 member records',
    });
    const footer = screen.getByText(/have training activity/);
    expect(footer.textContent).toContain('47 of 128 members');
    expect(footer.textContent).toContain('81 not in a program or course yet');
  });
});

describe('admin training roster — inferred programs', () => {
  it('marks a program that was inferred from activity rather than assigned', () => {
    // The "No program" badge sat directly beside a program title, which read
    // as a contradiction.
    renderRoster();
    const table = screen.getByRole('table');
    const noelRow = within(table).getByText('Noel Gonzalez').closest('tr');
    expect(noelRow?.textContent).toContain('No program');
    expect(noelRow?.textContent).toContain(`${IT} (inferred)`);
  });

  it('leaves an assigned program unmarked', () => {
    renderRoster();
    const table = screen.getByRole('table');
    const averyRow = within(table).getByText('Avery Stone').closest('tr');
    expect(averyRow?.textContent).toContain(IT);
    expect(averyRow?.textContent).not.toContain('inferred');
    expect(averyRow?.textContent).not.toContain('No program');
  });
});
