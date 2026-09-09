import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), {
    ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  }) },
}));
vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (handler: unknown) => handler }));
const dbMocks = vi.hoisted(() => ({
  courseEnrollment: { findFirst: vi.fn() },
  trainingStudyPlan: { findUnique: vi.fn(), upsert: vi.fn() },
  trainingCourseWork: { findMany: vi.fn(), upsert: vi.fn() },
}));
vi.mock('@/lib/db/prisma', () => ({ prisma: {
  ...dbMocks,
  $transaction: vi.fn(async (callback: (db: unknown) => unknown) => {
    const { prisma } = await import('@/lib/db/prisma');
    return callback(prisma);
  }),
} }));

import { GET, PUT } from '@/app/api/member/training-workspace/route';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getProgramCoursesForCurriculumVersion } from '@/lib/member/curriculumAssignment';

const USER = '10000000-0000-4000-8000-000000000001';
const OTHER = '10000000-0000-4000-8000-000000000002';
const PROGRAM = 'it-support-professional-certificate-ibm';
const VERSION = 'legacy-v1';
const COURSE = getProgramCoursesForCurriculumVersion(getProgramBySlug(PROGRAM)!, VERSION)[0]!.slug;
const NOW = new Date('2026-09-09T00:00:00.000Z');
const plans = new Map<string, any>();
const courseWork = new Map<string, any>();
const key = (row: any) => `${row.userId}:${row.programSlug}:${row.curriculumVersion}`;
const workKey = (row: any) => `${key(row)}:${row.courseSlug}`;

function request(body: unknown) {
  return new Request('http://localhost/api/member/training-workspace', { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
}
function plan(overrides: Record<string, unknown> = {}) {
  return { kind: 'plan', programSlug: PROGRAM, curriculumVersion: VERSION, weeklyHours: 10, planStartDate: '2026-09-09', ...overrides };
}
function work(overrides: Record<string, unknown> = {}) {
  return { kind: 'coursework', programSlug: PROGRAM, curriculumVersion: VERSION, courseSlug: COURSE, notes: 'My troubleshooting notes.', artifactUrl: 'https://example.org/my-project', ...overrides };
}
function read(programSlug = PROGRAM) {
  return GET(new Request(`http://localhost/api/member/training-workspace?programSlug=${programSlug}`));
}

describe('member training workspace API', () => {
  beforeEach(() => {
    vi.clearAllMocks(); plans.clear(); courseWork.clear();
    vi.mocked(getUser).mockResolvedValue({ id: USER } as any);
    dbMocks.courseEnrollment.findFirst.mockImplementation(async (query: any) => {
      const slugs = query.where.programSlug?.in;
      return !slugs || slugs.includes(PROGRAM) ? { programSlug: PROGRAM, curriculumVersion: VERSION } as any : null;
    });
    dbMocks.trainingStudyPlan.findUnique.mockImplementation(async (query: any) => plans.get(key(query.where.userId_programSlug_curriculumVersion)) ?? null);
    dbMocks.trainingStudyPlan.upsert.mockImplementation(async (query: any) => {
      const k = key(query.create);
      const row = { ...query.create, ...(plans.has(k) ? query.update : {}), updatedAt: NOW };
      plans.set(k, row); return row;
    });
    dbMocks.trainingCourseWork.findMany.mockImplementation(async (query: any) => [...courseWork.values()].filter((row) => key(row) === key(query.where) && query.where.courseSlug.in.includes(row.courseSlug)));
    dbMocks.trainingCourseWork.upsert.mockImplementation(async (query: any) => {
      const k = workKey(query.create);
      const row = { ...query.create, ...(courseWork.has(k) ? query.update : {}), updatedAt: NOW };
      courseWork.set(k, row); return row;
    });
  });

  it('requires authentication for reads and writes before querying any assignment', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    expect((await read()).status).toBe(401);
    expect((await PUT(request(plan()))).status).toBe(401);
    expect(prisma.courseEnrollment.findFirst).not.toHaveBeenCalled();
  });

  it('persists a real plan and coursework across subsequent loads, independently', async () => {
    expect((await PUT(request(plan()))).status).toBe(200);
    expect((await PUT(request(work()))).status).toBe(200);
    const response = await read();
    const { workspace } = await response.json();
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(workspace).toMatchObject({ programSlug: PROGRAM, curriculumVersion: VERSION, weeklyHours: 10, planStartDate: '2026-09-09', publishedSyllabusHours: 160 });
    expect(workspace.courses.find((course: any) => course.slug === COURSE)).toMatchObject({ notes: 'My troubleshooting notes.', artifactUrl: 'https://example.org/my-project' });
    const assigned = getProgramCoursesForCurriculumVersion(getProgramBySlug(PROGRAM)!, VERSION);
    expect(workspace.totalEstimatedHours).toBe(assigned.reduce((sum, course) => sum + course.estimatedHours, 0));
    expect(workspace.courses.map((course: any) => course.slug)).toEqual(assigned.map((course) => course.slug));
  });

  it('updates rather than duplicates drafts and allows clearing a saved artifact', async () => {
    await PUT(request(work()));
    await PUT(request(work({ notes: 'Revised notes', artifactUrl: null })));
    const { workspace } = await (await read()).json();
    expect(courseWork.size).toBe(1);
    expect(workspace.courses.find((course: any) => course.slug === COURSE)).toMatchObject({ notes: 'Revised notes', artifactUrl: null });
  });

  it('keeps another member’s notes and plan invisible even for the same course', async () => {
    await PUT(request(plan())); await PUT(request(work()));
    vi.mocked(getUser).mockResolvedValue({ id: OTHER } as any);
    const { workspace } = await (await read()).json();
    expect(workspace.weeklyHours).toBeNull();
    expect(workspace.courses.every((course: any) => course.notes === '' && course.artifactUrl === null)).toBe(true);
    await PUT(request(work({ notes: 'Other member’s notes' })));
    expect(courseWork.size).toBe(2);
    expect([...courseWork.values()].find((row) => row.userId === USER).notes).toBe('My troubleshooting notes.');
    expect(prisma.courseEnrollment.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: OTHER, user: { deletedAt: null } }) }));
  });

  it('rejects a supplied user id or query filters that could cross account boundaries', async () => {
    expect((await PUT(request(plan({ userId: OTHER })))).status).toBe(400);
    expect((await GET(new Request(`http://localhost/api/member/training-workspace?userId=${OTHER}`))).status).toBe(400);
    expect(prisma.trainingStudyPlan.upsert).not.toHaveBeenCalled();
  });

  it('returns no workspace and refuses writes for an unassigned program', async () => {
    const response = await read('comptia-a-professional-certificate');
    expect(await response.json()).toEqual({ workspace: null });
    const save = await PUT(request(plan({ programSlug: 'comptia-a-professional-certificate' })));
    expect(save.status).toBe(403);
    expect(prisma.trainingStudyPlan.upsert).not.toHaveBeenCalled();
  });

  it('refuses stale curriculum versions and courses outside the assigned list', async () => {
    expect((await PUT(request(plan({ curriculumVersion: '2026-approved-v2' })))).status).toBe(409);
    expect((await PUT(request(work({ courseSlug: 'another-program-course' })))).status).toBe(403);
    expect(prisma.trainingStudyPlan.upsert).not.toHaveBeenCalled();
    expect(prisma.trainingCourseWork.upsert).not.toHaveBeenCalled();
  });

  it('rejects a legacy-only course when an enrollment is pinned to approved v2', async () => {
    const programSlug = 'ux-design-professional-certificate-google';
    dbMocks.courseEnrollment.findFirst.mockResolvedValue({ programSlug, curriculumVersion: '2026-approved-v2' } as any);
    const approvedSlugs = new Set(getProgramCoursesForCurriculumVersion(getProgramBySlug(programSlug)!, '2026-approved-v2').map((course) => course.slug));
    const legacyCourse = getProgramCoursesForCurriculumVersion(getProgramBySlug(programSlug)!, VERSION).find((course) => !approvedSlugs.has(course.slug));
    expect(legacyCourse).toBeDefined();
    expect((await PUT(request(work({ programSlug, curriculumVersion: '2026-approved-v2', courseSlug: legacyCourse!.slug })))).status).toBe(403);
    expect(prisma.trainingCourseWork.upsert).not.toHaveBeenCalled();
  });

  it.each([0, 41, 3.5, '10'])('rejects invalid weekly hours %s', async (weeklyHours) => {
    expect((await PUT(request(plan({ weeklyHours })))).status).toBe(400);
    expect(prisma.trainingStudyPlan.upsert).not.toHaveBeenCalled();
  });

  it.each(['2026-02-30', '2026-13-01', 'tomorrow', '0000-01-01'])('rejects invalid dates %s', async (planStartDate) => {
    expect((await PUT(request(plan({ planStartDate })))).status).toBe(400);
  });

  it.each(['javascript:alert(1)', 'data:text/html,hello', 'file:///etc/passwd', 'not a link', 'https://user:secret@example.org'])('rejects unsafe or malformed artifact URLs %s', async (artifactUrl) => {
    expect((await PUT(request(work({ artifactUrl })))).status).toBe(400);
    expect(prisma.trainingCourseWork.upsert).not.toHaveBeenCalled();
  });

  it('enforces content bounds and malformed JSON without writes', async () => {
    expect((await PUT(request(work({ notes: 'a'.repeat(10001) })))).status).toBe(400);
    expect((await PUT(request(work({ artifactUrl: `https://example.org/${'a'.repeat(2000)}` })))).status).toBe(400);
    expect((await PUT(new Request('http://localhost/api/member/training-workspace', { method: 'PUT', body: '{' }))).status).toBe(400);
    expect(prisma.trainingCourseWork.upsert).not.toHaveBeenCalled();
  });

  it('accepts limit values and does not strip intentional whitespace from private notes', async () => {
    expect((await PUT(request(plan({ weeklyHours: 1, planStartDate: '2028-02-29' })))).status).toBe(200);
    expect((await PUT(request(plan({ weeklyHours: 40 })))).status).toBe(200);
    const notes = ` ${'a'.repeat(9998)} `;
    expect((await PUT(request(work({ notes })))).status).toBe(200);
    expect([...courseWork.values()][0].notes).toBe(notes);
  });

  it('fails closed for unknown pinned versions', async () => {
    dbMocks.courseEnrollment.findFirst.mockResolvedValue({ programSlug: PROGRAM, curriculumVersion: 'unknown-v9' } as any);
    expect(await (await read()).json()).toEqual({ workspace: null });
    expect((await PUT(request(work()))).status).toBe(403);
  });

  it('does not substitute legacy courses when an approved version lacks a manifest', async () => {
    dbMocks.courseEnrollment.findFirst.mockResolvedValue({ programSlug: PROGRAM, curriculumVersion: '2026-approved-v2' } as any);
    expect(await (await read()).json()).toEqual({ workspace: null });
    expect((await PUT(request(work({ curriculumVersion: '2026-approved-v2' })))).status).toBe(403);
    expect(prisma.trainingCourseWork.upsert).not.toHaveBeenCalled();
  });

  it('returns an honest unavailable error when persistence fails without leaking DB details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    dbMocks.trainingStudyPlan.upsert.mockRejectedValueOnce(new Error('private database hostname'));
    const response = await PUT(request(plan()));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private database hostname');
    dbMocks.trainingStudyPlan.findUnique.mockRejectedValueOnce(new Error('missing relation'));
    expect((await read()).status).toBe(503);
    vi.restoreAllMocks();
  });
});
