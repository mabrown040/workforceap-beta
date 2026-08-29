export type CourseraLaunchUser = {
  id: string;
  email?: string | null;
};

type DbUser = {
  enrolledProgram: string | null;
  organizationId: string | null;
  courseProgress: Array<{ programSlug: string; courseSlug: string }>;
} | null;

type ProgramWithCourses = {
  courses: Array<{ slug: string; courseraSlug?: string }>;
};

type CourseOverride = {
  courseraSlug: string | null;
  courseraUrlType?: string | null;
} | null;

type DiscoveredProgram = {
  courses: Array<{ slug: string; courseId: string }>;
} | null;

export type CourseraLaunchDependencies<ResponseLike, ProgramType extends ProgramWithCourses> = {
  getUser: () => Promise<CourseraLaunchUser | null>;
  findUser: (userId: string) => Promise<DbUser>;
  resolveActiveProgram: (userId: string, legacyEnrolledProgram: string | null) => Promise<string | null>;
  findCourse: (args: {
    organizationId: string;
    programSlug: string;
    courseSlug: string;
  }) => Promise<CourseOverride>;
  findFirstCourse: (args: {
    organizationId: string;
    programSlug: string;
  }) => Promise<CourseOverride>;
  getProgramBySlug: (programSlug: string) => ProgramType | null;
  getFirstIncompleteCourseIndex: (program: ProgramType, completedSlugs: string[]) => number | undefined;
  getCourseraConfig: () => { courseIdMap: Record<string, string[] | undefined> };
  buildCourseraLaunchUrl: (args: {
    programSlug: string | null;
    userId: string;
    email: string;
    currentCourseIndex?: number;
    currentCourseId?: string | null;
  }) => string | null;
  getDiscoveredProgram: (programSlug: string) => DiscoveredProgram;
  getOrgScopedCourseUrl: (
    programSlug: string,
    courseId: string,
    courseSlug: string,
  ) => Promise<string>;
  getOrgScopedProgramUrl: (programSlug: string) => Promise<string | null>;
  localFallbackUrl: (slug: string, kind: 'course' | 'specialization') => string;
  redirect: (url: URL | string) => ResponseLike;
};

function isProgramSpecificLaunchUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\/programs\//.test(url) || /\/learn\//.test(url) || /\/professional-certificates\//.test(url);
}

function isUselessProgramFallback(url: string | null): boolean {
  if (!url) return false;
  return (
    /^https?:\/\/(www\.)?coursera\.org\/?$/.test(url) ||
    /^https?:\/\/(www\.)?coursera\.org\/programs\/[^/?#]+\/?$/.test(url)
  );
}

function courseraUrlKind(urlType: string | null | undefined): 'course' | 'specialization' {
  return urlType === 'specializations' || urlType === 'specialization'
    ? 'specialization'
    : 'course';
}

export function createCourseraLaunchHandler<ResponseLike, ProgramType extends ProgramWithCourses>(
  deps: CourseraLaunchDependencies<ResponseLike, ProgramType>,
) {
  return async function courseraLaunchGET(request: Request): Promise<ResponseLike> {
    const user = await deps.getUser();
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', '/dashboard/training');
      return deps.redirect(loginUrl);
    }

    const dbUser = await deps.findUser(user.id);

    // Use the same active-program resolution as `/dashboard/training` and
    // the home dashboard so the launch button never disagrees with what the
    // member is looking at. Pre-fix this used `User.enrolledProgram` (legacy
    // single-program field) directly — when a member had multiple
    // CourseEnrollment rows with a primary that diverged from the legacy
    // field, the dashboard showed Program A while the launch button opened
    // Program B's course.
    const enrolledProgram = await deps.resolveActiveProgram(
      user.id,
      dbUser?.enrolledProgram ?? null,
    );
    const requestedSlug = new URL(request.url).searchParams.get('course')?.trim() || '';
    const program = enrolledProgram ? deps.getProgramBySlug(enrolledProgram) : null;

    if (requestedSlug && enrolledProgram) {
      if (dbUser?.organizationId) {
        const course = await deps.findCourse({
          organizationId: dbUser.organizationId,
          programSlug: enrolledProgram,
          courseSlug: requestedSlug,
        });

        if (course?.courseraSlug) {
          return deps.redirect(
            deps.localFallbackUrl(course.courseraSlug, courseraUrlKind(course.courseraUrlType)),
          );
        }
      }

      const discoveredProg = deps.getDiscoveredProgram(enrolledProgram);
      if (discoveredProg) {
        const discoveredCourse = discoveredProg.courses.find((c) => c.slug === requestedSlug);
        if (discoveredCourse) {
          const orgScoped = await deps.getOrgScopedCourseUrl(
            enrolledProgram,
            discoveredCourse.courseId,
            discoveredCourse.slug,
          );
          return deps.redirect(orgScoped);
        }
      }

      // A board-approved syllabus can replace a legacy Coursera collection
      // before the Enterprise discovery snapshot is refreshed. In that gap,
      // use the exact official /learn slug carried by the approved syllabus.
      // This must run before the index-based ID fallback so a new course at an
      // old index can never launch the retired course that previously occupied
      // that slot.
      const approvedCourse = program?.courses.find((course) => course.slug === requestedSlug);
      if (approvedCourse?.courseraSlug) {
        return deps.redirect(deps.localFallbackUrl(approvedCourse.courseraSlug, 'course'));
      }
    }
    const completedSlugs = enrolledProgram
      ? dbUser?.courseProgress
          .filter((row) => row.programSlug === enrolledProgram)
          .map((row) => row.courseSlug) ?? []
      : [];

    const requestedIndex = requestedSlug && program
      ? program.courses.findIndex((c) => c.slug === requestedSlug)
      : -1;

    const defaultCurrentIndex = program
      ? deps.getFirstIncompleteCourseIndex(program, completedSlugs)
      : undefined;

    const currentCourseIndex = requestedIndex >= 0 ? requestedIndex : defaultCurrentIndex;

    const courseIdMap = enrolledProgram ? deps.getCourseraConfig().courseIdMap[enrolledProgram] : undefined;
    const currentCourseId =
      courseIdMap && currentCourseIndex != null && currentCourseIndex >= 0
        ? courseIdMap[currentCourseIndex]
        : undefined;

    if (requestedSlug) {
      if (enrolledProgram && currentCourseId) {
        return deps.redirect(
          await deps.getOrgScopedCourseUrl(enrolledProgram, currentCourseId, requestedSlug),
        );
      }

      const errorUrl = new URL('/dashboard/training', request.url);
      errorUrl.searchParams.set('error', 'launch_failed');
      return deps.redirect(errorUrl);
    }

    const orgScopedProgramUrl = enrolledProgram
      ? await deps.getOrgScopedProgramUrl(enrolledProgram)
      : null;

    const configuredLaunchUrl = deps.buildCourseraLaunchUrl({
      programSlug: enrolledProgram,
      userId: user.id,
      email: user.email ?? '',
      currentCourseIndex,
      currentCourseId,
    });

    const resolvedUrl =
      (isProgramSpecificLaunchUrl(configuredLaunchUrl) ? configuredLaunchUrl : null) ??
      orgScopedProgramUrl ??
      configuredLaunchUrl ??
      null;

    let safeUrl = resolvedUrl;
    if (isUselessProgramFallback(safeUrl) && enrolledProgram && dbUser?.organizationId) {
      const firstCourse = await deps.findFirstCourse({
        organizationId: dbUser.organizationId,
        programSlug: enrolledProgram,
      });

      if (firstCourse?.courseraSlug) {
        safeUrl = deps.localFallbackUrl(
          firstCourse.courseraSlug,
          courseraUrlKind(firstCourse.courseraUrlType),
        );
      }
    }

    if (!safeUrl) {
      const errorUrl = new URL('/dashboard/training', request.url);
      errorUrl.searchParams.set('error', 'launch_failed');
      return deps.redirect(errorUrl);
    }

    return deps.redirect(safeUrl);
  };
}
