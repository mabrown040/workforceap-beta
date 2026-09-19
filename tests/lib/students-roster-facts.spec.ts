import { describe, expect, it } from 'vitest';
import { resolveStudentRosterActivity, resolveStudentRosterAssignment } from '@/lib/admin/studentsRosterFacts';

describe('student roster assignment policy', () => {
  it('retains a marked legacy-only assignment when no canonical enrollments exist', () => {
    expect(resolveStudentRosterAssignment({ enrolledProgram: 'comptia-a-plus', enrollments: [], courseFacts: [] }))
      .toMatchObject({ programSlug: 'comptia-a-professional-certificate', curriculumVersion: 'legacy-v1', source: 'legacy' });
  });

  it('resolves an unmarked enrollment through the legacy alias and retains its pinned curriculum', () => {
    expect(resolveStudentRosterAssignment({
      enrolledProgram: 'comptia-a-plus',
      enrollments: [{ programSlug: 'comptia-a-professional-certificate', curriculumVersion: '2026-approved-v2', isPrimary: false }],
      courseFacts: [],
    })).toMatchObject({ programSlug: 'comptia-a-professional-certificate', curriculumVersion: '2026-approved-v2', source: 'enrollment' });
  });

  it('does not count the same provider course from an unrelated program projection', () => {
    const fact = { courseSlug: 'course-1', courseId: 'shared-id', percentComplete: 100, status: 'COMPLETED' as const };
    const result = resolveStudentRosterAssignment({
      enrolledProgram: null,
      enrollments: [{ programSlug: 'comptia-a-plus', curriculumVersion: 'legacy-v1', isPrimary: true }],
      courseFacts: [{ ...fact, programSlug: 'other-program' }, { ...fact, programSlug: 'comptia-a-professional-certificate', percentComplete: 20, status: 'IN_PROGRESS' }],
    });
    expect(result.courseFacts).toHaveLength(1);
    expect(result.courseFacts[0].percentComplete).toBe(20);
  });
});

describe('student roster learner activity', () => {
  it('selects the newest learner action across provider, course, and portal activity', () => {
    const newest = new Date('2026-09-19T10:00:00Z');
    expect(resolveStudentRosterActivity({
      courseraActivityAt: new Date('2026-09-18T10:00:00Z'),
      courseActivityAt: new Date('2026-09-17T10:00:00Z'),
      portalLoginAt: newest,
    })).toEqual({ at: newest, source: 'portal_login' });
  });

  it('retains Coursera activity when portal login is old and no grade exists', () => {
    const newest = new Date('2026-09-18T10:00:00Z');
    expect(resolveStudentRosterActivity({ courseraActivityAt: newest, portalLoginAt: new Date('2026-06-01') }))
      .toEqual({ at: newest, source: 'coursera' });
  });

  it('accepts canonical course activity even when there is no raw provider row', () => {
    const at = new Date('2026-09-18T12:00:00Z');
    expect(resolveStudentRosterActivity({ courseActivityAt: at })).toEqual({ at, source: 'course_progress' });
  });

  it('leaves missing or invalid activity unknown instead of using a sync or account update', () => {
    expect(resolveStudentRosterActivity({})).toEqual({ at: null, source: null });
    expect(resolveStudentRosterActivity({ courseraActivityAt: new Date('invalid') })).toEqual({ at: null, source: null });
  });
});
