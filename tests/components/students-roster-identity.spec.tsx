import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentsRosterKit, type StudentRow } from '@/components/portal/kit/pages/admin-subviews/StudentsRosterKit';

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));

const students: StudentRow[] = ['member-first', 'member-second'].map((id, index) => ({
  id,
  name: 'Michael Brown',
  email: `michael.brown.${index + 1}@example.test`,
  location: 'Austin, TX',
  program: 'IT Support',
  progress: 0,
  readiness: 0,
  counselor: 'Unassigned',
  status: 'In Training',
  lastActive: 'Today',
}));

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

describe('student account identity', () => {
  it('shows different full emails in desktop rows for students with the same name', () => {
    render(<StudentsRosterKit students={students} total={students.length} />);
    const tbody = screen.getByRole('table').querySelector('tbody');
    expect(tbody).toBeTruthy();
    const rows = within(tbody as HTMLElement).getAllByRole('button');
    expect(rows).toHaveLength(2);
    for (const [index, row] of rows.entries()) {
      expect(within(row).getByText('Michael Brown')).toBeInTheDocument();
      expect(within(row).getByText(students[index].email)).toBeInTheDocument();
      expect(row).not.toHaveTextContent(students[1 - index].email);
    }
  });

  it('keeps the complete email in each mobile card and opens the matching account', async () => {
    const user = userEvent.setup();
    render(<StudentsRosterKit students={students} total={students.length} />);
    for (const student of students) {
      const card = screen.getAllByRole('button', { name: new RegExp(student.email.replaceAll('.', '\\.')) })
        .find((element) => element.tagName === 'DIV');
      expect(card).toBeDefined();
      if (!card) throw new Error('Expected a mobile student card');
      const email = within(card).getByText(student.email);
      expect(email).toHaveStyle({ overflowWrap: 'anywhere', whiteSpace: 'normal' });
      await user.click(card);
      expect(mocks.push).toHaveBeenLastCalledWith(`/admin/members/${student.id}`);
    }
  });
});
