import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@astryxdesign/core/Card', () => ({
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@astryxdesign/core/SegmentedControl', () => ({
  SegmentedControl: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SegmentedControlItem: () => null,
}));
vi.mock('@astryxdesign/core/Token', () => ({
  Token: ({ label }: { label: string }) => <span>{label}</span>,
}));
vi.mock('@astryxdesign/core/ProgressBar', () => ({
  ProgressBar: () => <div role="progressbar" />,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { StudentsRosterKit, type StudentRow } from '@/components/portal/kit/pages/admin-subviews/StudentsRosterKit';

afterEach(cleanup);

const rows: StudentRow[] = [
  {
    id: '1',
    name: 'Avery Stone',
    email: 'avery@example.test',
    location: 'Austin, TX',
    program: 'IT Support',
    progress: 91,
    readiness: 84,
    counselor: 'S. Chen',
    status: 'Job-Ready',
    lastActive: '2h ago',
    lastActiveAt: 3,
  },
  {
    id: '2',
    name: 'Blake Reed',
    email: 'blake@example.test',
    location: 'Austin, TX',
    program: 'Healthcare',
    progress: 22,
    readiness: 40,
    counselor: 'R. Patel',
    status: 'At Risk',
    lastActive: '16d ago',
    lastActiveAt: 1,
  },
  {
    id: '3',
    name: 'Casey Lane',
    email: 'casey@example.test',
    location: 'Round Rock, TX',
    program: 'Data & AI',
    progress: 55,
    readiness: 70,
    counselor: 'S. Chen',
    status: 'In Training',
    lastActive: '5h ago',
    lastActiveAt: 2,
  },
];

function namesInTable(): string[] {
  const table = document.querySelector('table');
  if (!table) return [];
  return Array.from(table.querySelectorAll('tbody tr'))
    .map((row) => row.querySelector('td:first-child div > div > div')?.textContent?.trim() ?? '')
    .filter(Boolean);
}

describe('StudentsRosterKit column sorting', () => {
  it('opens with most recently active first', () => {
    render(<StudentsRosterKit students={rows} total={rows.length} />);
    expect(namesInTable()).toEqual(['Avery Stone', 'Casey Lane', 'Blake Reed']);
  });

  it('re-sorts when a column header is clicked', () => {
    render(<StudentsRosterKit students={rows} total={rows.length} />);
    fireEvent.click(screen.getByRole('button', { name: /^Sort by Student/ }));
    expect(namesInTable()[0]).toBe('Avery Stone');
    fireEvent.click(screen.getByRole('button', { name: /^Sort by Student, ascending/ }));
    expect(namesInTable()[0]).toBe('Casey Lane');
  });

  it('sorts by progress from the column header', () => {
    render(<StudentsRosterKit students={rows} total={rows.length} />);
    fireEvent.click(screen.getByRole('button', { name: /^Sort by Progress/ }));
    expect(namesInTable()[0]).toBe('Avery Stone');
  });
});
