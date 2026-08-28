import test from 'node:test';
import assert from 'node:assert/strict';
import { createCourseraLaunchHandler, type CourseraLaunchDependencies } from './launchRouteCore';

type RedirectResult = { redirectedTo: string };
type TestProgram = { courses: Array<{ slug: string }> };

const redirect = (url: URL | string): RedirectResult => ({ redirectedTo: String(url) });

function makeDeps(
  overrides: Partial<CourseraLaunchDependencies<RedirectResult, TestProgram>> = {},
): CourseraLaunchDependencies<RedirectResult, TestProgram> {
  return {
    getUser: async () => ({ id: 'user-1', email: 'member@example.org' }),
    findUser: async () => ({
      enrolledProgram: 'it-support-professional-certificate-ibm',
      organizationId: 'org-1',
      courseProgress: [],
    }),
    resolveActiveProgram: async (_userId, legacyEnrolledProgram) => legacyEnrolledProgram,
    findCourse: async () => null,
    findFirstCourse: async () => null,
    getProgramBySlug: () => ({
      courses: [
        { slug: 'first-course' },
        { slug: 'second-course' },
      ],
    }),
    getFirstIncompleteCourseIndex: () => 0,
    getCourseraConfig: () => ({
      courseIdMap: { 'it-support-professional-certificate-ibm': ['course-id-1', 'course-id-2'] },
    }),
    buildCourseraLaunchUrl: () => null,
    getDiscoveredProgram: () => null,
    getOrgScopedCourseUrl: async () => 'https://www.coursera.org/programs/org-program/learn/course-id-2',
    getOrgScopedProgramUrl: async () => null,
    localFallbackUrl: (slug: string, kind: 'course' | 'specialization') =>
      `https://www.coursera.org/${kind === 'specialization' ? 'specializations' : 'learn'}/${slug}`,
    redirect,
    ...overrides,
  };
}

test('Coursera launch route redirects unauthenticated members to login with training redirect', async () => {
  const handler = createCourseraLaunchHandler(makeDeps({ getUser: async () => null }));

  const res = await handler(new Request('https://workforceap.test/api/member/coursera/launch'));

  assert.equal(res.redirectedTo, 'https://workforceap.test/login?redirectTo=%2Fdashboard%2Ftraining');
});

test('Coursera launch route uses DB course override for requested course deep link', async () => {
  const handler = createCourseraLaunchHandler(makeDeps({
    findCourse: async () => ({ courseraSlug: 'db-course-slug', courseraUrlType: 'specialization' }),
  }));

  const res = await handler(new Request('https://workforceap.test/api/member/coursera/launch?course=second-course'));

  assert.equal(res.redirectedTo, 'https://www.coursera.org/specializations/db-course-slug');
});

test('Coursera launch route passes discovered course slug to the org-scoped resolver', async () => {
  let resolvedArgs: [string, string, string] | null = null;
  const handler = createCourseraLaunchHandler(makeDeps({
    getDiscoveredProgram: () => ({
      courses: [{ slug: 'second-course', courseId: 'course-id-2' }],
    }),
    getOrgScopedCourseUrl: async (programSlug, courseId, courseSlug) => {
      resolvedArgs = [programSlug, courseId, courseSlug];
      return `https://www.coursera.org/learn/${courseSlug}`;
    },
  }));

  const res = await handler(new Request('https://workforceap.test/api/member/coursera/launch?course=second-course'));

  assert.deepEqual(resolvedArgs, [
    'it-support-professional-certificate-ibm',
    'course-id-2',
    'second-course',
  ]);
  assert.equal(res.redirectedTo, 'https://www.coursera.org/learn/second-course');
});

test('Coursera launch route uses configured course mapping for a requested course', async () => {
  const handler = createCourseraLaunchHandler(makeDeps());

  const res = await handler(new Request('https://workforceap.test/api/member/coursera/launch?course=second-course'));

  assert.equal(
    res.redirectedTo,
    'https://www.coursera.org/programs/org-program/learn/course-id-2',
  );
});

test('Coursera launch route keeps an unmapped requested course inside WorkforceAP', async () => {
  const handler = createCourseraLaunchHandler(makeDeps({
    getCourseraConfig: () => ({ courseIdMap: {} }),
    getOrgScopedProgramUrl: async () => 'https://www.coursera.org/',
    buildCourseraLaunchUrl: () => 'https://www.coursera.org/',
  }));

  const res = await handler(new Request('https://workforceap.test/api/member/coursera/launch?course=second-course'));

  assert.equal(res.redirectedTo, 'https://workforceap.test/dashboard/training?error=launch_failed');
});

test('Coursera launch route uses active dashboard program instead of legacy enrolledProgram', async () => {
  const handler = createCourseraLaunchHandler(makeDeps({
    resolveActiveProgram: async () => 'cybersecurity-professional-certificate-google',
    getCourseraConfig: () => ({
      courseIdMap: { 'cybersecurity-professional-certificate-google': ['active-course-id'] },
    }),
    buildCourseraLaunchUrl: ({ programSlug, currentCourseId }) =>
      `https://www.coursera.org/programs/${programSlug}/learn/${currentCourseId}`,
  }));

  const res = await handler(new Request('https://workforceap.test/api/member/coursera/launch'));

  assert.equal(
    res.redirectedTo,
    'https://www.coursera.org/programs/cybersecurity-professional-certificate-google/learn/active-course-id',
  );
});

test('Coursera launch route falls through to resolved configured launch URL', async () => {
  const handler = createCourseraLaunchHandler(makeDeps({
    buildCourseraLaunchUrl: () => 'https://www.coursera.org/programs/configured-program/learn/course',
    getOrgScopedProgramUrl: async () => 'https://www.coursera.org/programs/org-program',
  }));

  const res = await handler(new Request('https://workforceap.test/api/member/coursera/launch'));

  assert.equal(res.redirectedTo, 'https://www.coursera.org/programs/configured-program/learn/course');
});

test('Coursera launch route replaces useless Coursera program fallback with first org course URL', async () => {
  const handler = createCourseraLaunchHandler(makeDeps({
    getOrgScopedProgramUrl: async () => 'https://www.coursera.org/programs/it-support-professional-certificate-ibm',
    findFirstCourse: async () => ({ courseraSlug: 'first-course-slug', courseraUrlType: 'learn' }),
  }));

  const res = await handler(new Request('https://workforceap.test/api/member/coursera/launch'));

  assert.equal(res.redirectedTo, 'https://www.coursera.org/learn/first-course-slug');
});

test('Coursera launch route redirects to training error when no launch URL resolves', async () => {
  const handler = createCourseraLaunchHandler(makeDeps({
    buildCourseraLaunchUrl: () => null,
    getOrgScopedProgramUrl: async () => null,
  }));

  const res = await handler(new Request('https://workforceap.test/api/member/coursera/launch'));

  assert.equal(res.redirectedTo, 'https://workforceap.test/dashboard/training?error=launch_failed');
});
