import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { buildCourseraLaunchUrl, getCourseraConfig } from '@/lib/coursera/config';
import { getProgramBySlug } from '@/lib/content/programs';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import {
  getOrgScopedCourseUrl,
  getOrgScopedProgramUrl,
  localFallbackUrl,
} from '@/lib/coursera/orgScopedUrls';
import { getFirstIncompleteCourseIndex } from '@/lib/member/courseraCourseProgress';
import { getActiveProgramForDashboard } from '@/lib/member/getActiveProgramForDashboard';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const GET = withApiGuc(async (request: Request) => {
  try {
  const user = await getUser();
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', '/dashboard');
    return NextResponse.redirect(loginUrl);
  }

  const dbUser = await prisma.$transaction((tx) => tx.user.findUnique({
    where: { id: user.id },
    select: {
      enrolledProgram: true,
      organizationId: true,
      courseProgress: {
        where: { status: 'COMPLETED' },
        select: { programSlug: true, courseSlug: true },
      },
    },
  }));

  // Use the same active-program resolution as `/dashboard/training` and
  // the home dashboard so the launch button never disagrees with what the
  // member is looking at. Pre-fix this used `User.enrolledProgram` (legacy
  // single-program field) directly — when a member had multiple
  // CourseEnrollment rows with a primary that diverged from the legacy
  // field, the dashboard showed Program A while the launch button opened
  // Program B's course.
  const activeProgramView = await getActiveProgramForDashboard({
    userId: user.id,
  });
  const enrolledProgram = activeProgramView.activeProgramSlug;
  /* Optional ?course=<slug> deep-links to a specific course in the enrolled program. */
  const requestedSlug = new URL(request.url).searchParams.get('course')?.trim() || '';

  if (requestedSlug && enrolledProgram) {
    // Prefer DB override first (org-configured course URL type / slug). Org
    // admins set this when their org has a special URL pattern that diverges
    // from the discovered catalog. We still respect the configured kind
    // (`learn` vs `specialization`) and just centralize the host through
    // `localFallbackUrl` so it stays in one place.
    if (dbUser?.organizationId) {
      const course = await prisma.$transaction((tx) => tx.course.findUnique({
        where: {
          organizationId_programSlug_courseSlug: {
            organizationId: dbUser.organizationId,
            programSlug: enrolledProgram,
            courseSlug: requestedSlug,
          }
        }
      }));

      if (course && course.courseraSlug) {
        const urlType = course.courseraUrlType || 'learn';
        const kind = urlType === 'specializations' || urlType === 'specialization'
          ? ('specialization' as const)
          : ('course' as const);
        return NextResponse.redirect(localFallbackUrl(course.courseraSlug, kind));
      }
    }

    // Fallback: construct an org-scoped deep link from the B4B / discovered
    // catalog so authenticated learners land inside their program shell.
    const discoveredProg = DISCOVERED_COURSERA_PROGRAMS[enrolledProgram];
    if (discoveredProg) {
      const discoveredCourse = discoveredProg.courses.find((c) => c.slug === requestedSlug);
      if (discoveredCourse) {
        const orgScoped = await getOrgScopedCourseUrl(
          enrolledProgram,
          discoveredCourse.courseId,
        );
        return NextResponse.redirect(orgScoped);
      }
    }
  }

  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const completedSlugs = enrolledProgram
    ? dbUser?.courseProgress
        .filter((row) => row.programSlug === enrolledProgram)
        .map((row) => row.courseSlug) ?? []
    : [];

  const requestedIndex = requestedSlug && program
    ? program.courses.findIndex((c) => c.slug === requestedSlug)
    : -1;

  const defaultCurrentIndex = program
    ? getFirstIncompleteCourseIndex(program, completedSlugs)
    : undefined;

  const currentCourseIndex = requestedIndex >= 0 ? requestedIndex : defaultCurrentIndex;

  const courseIdMap = enrolledProgram ? getCourseraConfig().courseIdMap[enrolledProgram] : undefined;
  const currentCourseId =
    courseIdMap && currentCourseIndex != null && currentCourseIndex >= 0
      ? courseIdMap[currentCourseIndex]
      : undefined;

  // Prefer (1) a configured deep link when it is clearly program/course-specific,
  // then (2) the org-scoped program URL for the member's actual enrollment
  // (resolved from B4B at runtime so we always have a current value), then
  // (3) the generic Coursera platform root. This avoids dropping members on a
  // broad homepage or admin landing when we know their enrolled learner program
  // URL (#95).
  const orgScopedProgramUrl = enrolledProgram
    ? await getOrgScopedProgramUrl(enrolledProgram)
    : null;

  const configuredLaunchUrl = buildCourseraLaunchUrl({
    programSlug: enrolledProgram,
    userId: user.id,
    email: user.email ?? '',
    currentCourseIndex,
    currentCourseId,
  });

  const isProgramSpecificLaunchUrl = (url: string | null | undefined) => {
    if (!url) return false;
    return /\/programs\//.test(url) || /\/learn\//.test(url) || /\/professional-certificates\//.test(url);
  };

  const resolvedUrl =
    (isProgramSpecificLaunchUrl(configuredLaunchUrl) ? configuredLaunchUrl : null) ??
    orgScopedProgramUrl ??
    configuredLaunchUrl ??
    null;

  // The fallback in `getOrgScopedProgramUrl` produces
  // `coursera.org/programs/{ourSlug}` when neither the discovered catalog
  // nor B4B can resolve a real org-scoped URL. That path 404s on Coursera
  // because our internal program slug isn't a registered Coursera program
  // slug. When we detect the bad pattern, redirect instead to the first
  // course's `/learn/{courseraSlug}` — a real Coursera page — so the
  // member at least lands somewhere they can study.
  // The fallback in `getOrgScopedProgramUrl` produces either
  // `coursera.org/programs/{ourSlug}` (legacy 404 path) or the bare
  // platform root when neither the discovered catalog nor B4B can
  // resolve a real org-scoped URL. Both lose program context. When we
  // detect either pattern, redirect instead to the first course's
  // `/learn/{courseraSlug}` — a real Coursera page — so the member at
  // least lands somewhere they can study.
  let safeUrl = resolvedUrl;
  const isUselessProgramFallback = (url: string | null) => {
    if (!url) return false;
    return (
      /^https?:\/\/(www\.)?coursera\.org\/?$/.test(url) ||
      /^https?:\/\/(www\.)?coursera\.org\/programs\/[^/?#]+\/?$/.test(url)
    );
  };
  if (isUselessProgramFallback(safeUrl) && enrolledProgram && dbUser?.organizationId) {
    const firstCourse = await prisma.$transaction((tx) => tx.course.findFirst({
      where: {
        organizationId: dbUser.organizationId,
        programSlug: enrolledProgram,
        courseraSlug: { not: null },
      },
      orderBy: { displayOrder: 'asc' },
      select: { courseraSlug: true, courseraUrlType: true },
    }));
    if (firstCourse?.courseraSlug) {
      const urlType = firstCourse.courseraUrlType || 'learn';
      const kind =
        urlType === 'specializations' || urlType === 'specialization'
          ? ('specialization' as const)
          : ('course' as const);
      safeUrl = localFallbackUrl(firstCourse.courseraSlug, kind);
    }
  }

  if (!safeUrl) {
    const errorUrl = new URL('/dashboard', request.url);
    errorUrl.searchParams.set('error', 'launch_failed');
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(safeUrl);

  } catch (error) {
    console.error('/member/coursera/launch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

