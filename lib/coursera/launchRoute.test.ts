import test from 'node:test';

/**
 * TODO: Route-level regression test for GET /api/member/coursera/launch
 *
 * Why this is a scaffold only:
 * - The repo uses node:test (not vitest/jest), making ES module mocking of
 *   Next.js route handlers, getUser, and prisma significantly more complex.
 * - A full route test would need to mock:
 *   1. next/server (NextResponse.redirect)
 *   2. @/lib/auth/server (getUser)
 *   3. @/lib/db/prisma (prisma.user.findUnique, prisma.course.findUnique)
 *   4. @/lib/coursera/config (buildCourseraLaunchUrl, getCourseraConfig, getCourseraReadiness)
 *   5. @/lib/content/programs (getProgramBySlug)
 *   6. @/lib/content/courseraDiscoveredCatalog (DISCOVERED_COURSERA_PROGRAMS)
 * - E2E coverage already exists in tests/e2e/sprint-p2-xapi-coursera-smoke.spec.ts
 *   for the unauthenticated redirect path.
 *
 * When we migrate to vitest or add a next-test-helpers layer, the following
 * cases should be covered:
 * 1. Unauthenticated → redirects to /login with redirectTo param.
 * 2. Authenticated, no enrolledProgram, no config → redirects to /dashboard/coursera?error=launch_failed.
 * 3. Authenticated, enrolledProgram, config present → redirects to a resolved program/deep-link URL.
 * 4. Authenticated, ?course=<slug> with DB override → redirects to configured courseraSlug URL.
 * 5. Authenticated, ?course=<slug> with discovered catalog match → redirects to discovered program/course URL.
 */

test('launch route: TODO — add route-level tests when test infra supports Next.js route mocking', () => {
  // Placeholder so this file registers in test runs and reminds us to fill it.
});
