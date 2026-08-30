import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findEnrollment: vi.fn(),
  completeMemberCourse: vi.fn(),
  auditLog: vi.fn(),
  logAuditEvent: vi.fn(),
}));

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: unknown) => handler,
}));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    courseEnrollment: { findUnique: mocks.findEnrollment },
  },
}));
vi.mock('@/lib/member/courseCompletion', () => ({
  completeMemberCourse: mocks.completeMemberCourse,
}));
vi.mock('@/lib/audit', () => ({ auditLog: mocks.auditLog }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: mocks.logAuditEvent }));

import { POST } from '@/app/api/member/courses/complete/route';

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/member/courses/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/member/courses/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ id: 'user-1' });
    mocks.findEnrollment.mockResolvedValue({ programSlug: 'assigned-program' });
    mocks.completeMemberCourse.mockResolvedValue({ completed: true });
    mocks.auditLog.mockResolvedValue(undefined);
    mocks.logAuditEvent.mockResolvedValue(undefined);
  });

  it('requires an explicit program slug before looking up an enrollment', async () => {
    const response = await POST(request({ courseSlug: 'course-1' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'programSlug is required' });
    expect(mocks.findEnrollment).not.toHaveBeenCalled();
    expect(mocks.completeMemberCourse).not.toHaveBeenCalled();
  });

  it('fails closed when the exact program is not assigned to the member', async () => {
    mocks.findEnrollment.mockResolvedValue(null);

    const response = await POST(request({
      courseSlug: 'course-1',
      programSlug: 'unassigned-program',
    }));

    expect(mocks.findEnrollment).toHaveBeenCalledWith({
      where: {
        userId_programSlug: {
          userId: 'user-1',
          programSlug: 'unassigned-program',
        },
      },
      select: { programSlug: true },
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'This program is not assigned to your account.',
      code: 'PROGRAM_NOT_ASSIGNED',
    });
    expect(mocks.completeMemberCourse).not.toHaveBeenCalled();
  });

  it('completes against the exact authorized enrollment slug', async () => {
    mocks.findEnrollment.mockResolvedValue({ programSlug: 'assigned-alias' });

    const response = await POST(request({
      courseSlug: 'course-1',
      programSlug: 'assigned-alias',
    }));

    expect(response.status).toBe(200);
    expect(mocks.completeMemberCourse).toHaveBeenCalledWith({
      userId: 'user-1',
      courseSlug: 'course-1',
      resolvedProgramSlug: 'assigned-alias',
      source: 'member',
    });
  });
});

describe('Learning Hub completion identity contract', () => {
  const learningPage = readFileSync(
    join(process.cwd(), 'app/(portal)/dashboard/learning/page.tsx'),
    'utf8',
  );
  const enrolledCourses = readFileSync(
    join(process.cwd(), 'components/portal/LearningHubEnrolledCourses.tsx'),
    'utf8',
  );
  const trainingCourseList = readFileSync(
    join(process.cwd(), 'components/portal/TrainingCourseList.tsx'),
    'utf8',
  );

  it('renders the active enrollment curriculum and retains legacy fallback', () => {
    expect(learningPage).toContain('resolveActiveDashboardProgram({');
    expect(learningPage).toContain('curriculumVersion: true');
    expect(learningPage).toContain('activeEnrollment?.curriculumVersion');
    expect(learningPage).toContain('getProgramCoursesForCurriculumVersion(');
    expect(learningPage).toContain("activeEnrollment?.curriculumVersion ?? 'legacy-v1'");
  });

  it('threads the exact program slug through both Hub layouts into completion POST', () => {
    expect(learningPage.match(/programSlug=\{enrolledProgram\}/g)).toHaveLength(2);
    expect(enrolledCourses).toContain('programSlug={programSlug}');
    expect(trainingCourseList).toContain(
      'body: JSON.stringify({ courseSlug: slug, programSlug })',
    );
  });
});
