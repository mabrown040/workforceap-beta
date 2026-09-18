import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STUDENT_SORT_DIRECTION,
  DEFAULT_STUDENT_SORT_KEY,
  sortStudentRows,
  type StudentSortKey,
} from '@/lib/admin/studentsRosterSort';
import type { StudentRow } from '@/components/portal/kit/pages/admin-subviews/StudentsRosterKit';

function row(over: Partial<StudentRow> & { id: string }): StudentRow {
  return {
    name: 'Learner',
    email: 'learner@example.test',
    location: 'Austin, TX',
    program: 'IT Support',
    progress: 0,
    readiness: 0,
    counselor: 'Unassigned',
    status: 'In Training',
    lastActive: 'Today',
    ...over,
  };
}

const A = row({ id: 'a', name: 'Avery', progress: 90, readiness: 80, lastActiveAt: 3 });
const B = row({ id: 'b', name: 'Blake', progress: 20, readiness: 40, lastActiveAt: 2 });
const C = row({ id: 'c', name: 'Casey', progress: 20, readiness: 60, courseraGrade: 88, lastActiveAt: 1 });
const ALL = [A, B, C];

describe('students roster sorting', () => {
  it('defaults to most recently active first', () => {
    expect(sortStudentRows(ALL, DEFAULT_STUDENT_SORT_KEY, DEFAULT_STUDENT_SORT_DIRECTION).map((r) => r.id))
      .toEqual(['a', 'b', 'c']);
  });

  it('sorts by student name in both directions', () => {
    expect(sortStudentRows(ALL, 'name', 'asc').map((r) => r.name)).toEqual(['Avery', 'Blake', 'Casey']);
    expect(sortStudentRows(ALL, 'name', 'desc').map((r) => r.name)).toEqual(['Casey', 'Blake', 'Avery']);
  });

  it('keeps ungraded rows last in both directions', () => {
    const withNull = [...ALL, row({ id: 'd', name: 'Dana', courseraGrade: null })];
    expect(sortStudentRows(withNull, 'courseraGrade', 'desc').slice(-1)[0].id).toBe('d');
    expect(sortStudentRows(withNull, 'courseraGrade', 'asc').slice(-1)[0].id).toBe('d');
  });

  it('orders status by severity rather than alphabetically', () => {
    const statuses = [
      row({ id: 'p', status: 'Placed' }),
      row({ id: 'r', status: 'At Risk' }),
      row({ id: 'j', status: 'Job-Ready' }),
    ];
    expect(sortStudentRows(statuses, 'status', 'asc').map((r) => r.status))
      .toEqual(['At Risk', 'Job-Ready', 'Placed']);
  });
});
