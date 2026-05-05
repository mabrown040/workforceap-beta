import 'server-only';

import { prisma } from '@/lib/db/prisma';

export type BadgeProgressSummary = {
  totalRows: number;
  latestSyncedAt: Date | null;
  topLearners: Array<{
    id: string;
    externalEmail: string;
    externalName: string | null;
    badgeTitle: string;
    badgeSlug: string;
    badgeLink: string | null;
    numberOfCourses: number;
    progressPercent: number;
    coursesCompleted: number;
    currentCourseName: string | null;
    badgeCompleted: boolean;
    lastActivityTime: Date | null;
    user: { fullName: string; email: string } | null;
  }>;
};

export async function loadBadgeProgressSummary(): Promise<BadgeProgressSummary | null> {
  try {
    const summaryRows = await prisma.$queryRaw<Array<{ total: bigint | number; latest: Date | null }>>`
      SELECT COUNT(*)::bigint AS total, MAX(last_synced_at) AS latest FROM coursera_badge_progress
    `;
    const top = await prisma.$queryRaw<Array<{
      id: string;
      externalEmail: string;
      externalName: string | null;
      badgeTitle: string;
      badgeSlug: string;
      badgeLink: string | null;
      numberOfCourses: number;
      progressPercent: string | number;
      coursesCompleted: number;
      currentCourseName: string | null;
      badgeCompleted: boolean;
      lastActivityTime: Date | null;
      userFullName: string | null;
      userEmail: string | null;
    }>>`
      SELECT
        cbp.id,
        cbp.external_email AS "externalEmail",
        cbp.external_name AS "externalName",
        cbp.badge_title AS "badgeTitle",
        cbp.badge_slug AS "badgeSlug",
        cbp.badge_link AS "badgeLink",
        cbp.number_of_courses AS "numberOfCourses",
        cbp.progress_percent AS "progressPercent",
        cbp.courses_completed AS "coursesCompleted",
        cbp.current_course_name AS "currentCourseName",
        cbp.badge_completed AS "badgeCompleted",
        cbp.last_activity_time AS "lastActivityTime",
        u.full_name AS "userFullName",
        u.email AS "userEmail"
      FROM coursera_badge_progress cbp
      LEFT JOIN users u ON u.id = cbp.user_id
      ORDER BY cbp.progress_percent DESC, cbp.last_activity_time DESC NULLS LAST
      LIMIT 10
    `;

    return {
      totalRows: Number(summaryRows[0]?.total ?? 0),
      latestSyncedAt: summaryRows[0]?.latest ?? null,
      topLearners: top.map((row) => ({
        id: row.id,
        externalEmail: row.externalEmail,
        externalName: row.externalName,
        badgeTitle: row.badgeTitle,
        badgeSlug: row.badgeSlug,
        badgeLink: row.badgeLink,
        numberOfCourses: Number(row.numberOfCourses) || 0,
        progressPercent: Number(row.progressPercent) || 0,
        coursesCompleted: Number(row.coursesCompleted) || 0,
        currentCourseName: row.currentCourseName,
        badgeCompleted: row.badgeCompleted,
        lastActivityTime: row.lastActivityTime,
        user: row.userFullName && row.userEmail
          ? { fullName: row.userFullName, email: row.userEmail }
          : null,
      })),
    };
  } catch (error) {
    console.error('[admin/coursera] failed to load badge progress summary:', error);
    return null;
  }
}

export type UnmatchedLearner = {
  externalEmail: string;
  externalName: string | null;
  badges: Array<{ badgeSlug: string; badgeTitle: string; progressPercent: number }>;
  courseCount: number;
  badgeCount: number;
  lastActivityTime: Date | null;
};

/**
 * Distinct externalEmail across coursera_course_progress + coursera_badge_progress
 * where userId IS NULL — i.e. learners on Coursera that we have not bound to a
 * WAP user yet.
 */
export async function loadUnmatchedLearners(limit = 100): Promise<UnmatchedLearner[]> {
  try {
    type Row = {
      externalEmail: string;
      externalName: string | null;
      courseCount: bigint | number;
      badgeCount: bigint | number;
      lastActivityTime: Date | null;
    };

    const learners = await prisma.$queryRaw<Row[]>`
      WITH unioned AS (
        SELECT
          LOWER(external_email) AS email,
          MAX(external_name) AS name,
          MAX(last_activity_time) AS last_activity_time,
          COUNT(*) AS course_count,
          0::bigint AS badge_count
        FROM coursera_course_progress
        WHERE user_id IS NULL
        GROUP BY LOWER(external_email)
        UNION ALL
        SELECT
          LOWER(external_email) AS email,
          MAX(external_name) AS name,
          MAX(last_activity_time) AS last_activity_time,
          0::bigint AS course_count,
          COUNT(*) AS badge_count
        FROM coursera_badge_progress
        WHERE user_id IS NULL
        GROUP BY LOWER(external_email)
      )
      SELECT
        email AS "externalEmail",
        MAX(name) AS "externalName",
        SUM(course_count)::bigint AS "courseCount",
        SUM(badge_count)::bigint AS "badgeCount",
        MAX(last_activity_time) AS "lastActivityTime"
      FROM unioned
      GROUP BY email
      ORDER BY MAX(last_activity_time) DESC NULLS LAST
      LIMIT ${limit}
    `;

    if (learners.length === 0) return [];

    const emails = learners.map((l) => l.externalEmail);

    const badges = await prisma.$queryRaw<
      Array<{ externalEmail: string; badgeSlug: string; badgeTitle: string; progressPercent: string | number }>
    >`
      SELECT
        LOWER(external_email) AS "externalEmail",
        badge_slug AS "badgeSlug",
        badge_title AS "badgeTitle",
        progress_percent AS "progressPercent"
      FROM coursera_badge_progress
      WHERE LOWER(external_email) = ANY(${emails}::text[])
        AND user_id IS NULL
    `;

    const badgesByEmail = new Map<string, UnmatchedLearner['badges']>();
    for (const row of badges) {
      const list = badgesByEmail.get(row.externalEmail) ?? [];
      list.push({
        badgeSlug: row.badgeSlug,
        badgeTitle: row.badgeTitle,
        progressPercent: Number(row.progressPercent) || 0,
      });
      badgesByEmail.set(row.externalEmail, list);
    }

    return learners.map((row) => ({
      externalEmail: row.externalEmail,
      externalName: row.externalName,
      badges: badgesByEmail.get(row.externalEmail) ?? [],
      courseCount: Number(row.courseCount) || 0,
      badgeCount: Number(row.badgeCount) || 0,
      lastActivityTime: row.lastActivityTime,
    }));
  } catch (error) {
    console.error('[admin/coursera] failed to load unmatched learners:', error);
    return [];
  }
}

export type LearnerCourseRow = {
  id: string;
  courseName: string;
  courseraCourseId: string;
  courseraCourseSlug: string | null;
  university: string | null;
  programSlug: string;
  programName: string | null;
  overallProgress: number;
  learningHours: number;
  isCompleted: boolean;
  enrollmentTime: Date | null;
  lastActivityTime: Date | null;
  completionTime: Date | null;
  certificateUrl: string | null;
  courseGrade: string | null;
};

export type LearnerBadgeRow = {
  id: string;
  badgeTitle: string;
  badgeSlug: string;
  badgeLink: string | null;
  numberOfCourses: number;
  coursesCompleted: number;
  progressPercent: number;
  currentCourseName: string | null;
  badgeCompleted: boolean;
  badgeCompletionTime: Date | null;
  lastActivityTime: Date | null;
  totalLearningHours: number;
};

export type LearnerProgressDetail = {
  externalEmail: string | null;
  externalName: string | null;
  user: { id: string; fullName: string; email: string } | null;
  courses: LearnerCourseRow[];
  badges: LearnerBadgeRow[];
};

export async function loadLearnerProgressByUserId(userId: string): Promise<LearnerProgressDetail | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true },
    });
    if (!user) return null;

    const courses = await loadCoursesForUserId(userId);
    const badges = await loadBadgesForUserId(userId);

    return {
      externalEmail: null,
      externalName: null,
      user,
      courses,
      badges,
    };
  } catch (error) {
    console.error('[admin/coursera] failed to load learner detail:', error);
    return null;
  }
}

async function loadCoursesForUserId(userId: string): Promise<LearnerCourseRow[]> {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    courseName: string;
    courseraCourseId: string;
    courseraCourseSlug: string | null;
    university: string | null;
    programSlug: string;
    programName: string | null;
    overallProgress: string | number;
    learningHours: string | number;
    isCompleted: boolean;
    enrollmentTime: Date | null;
    lastActivityTime: Date | null;
    completionTime: Date | null;
    certificateUrl: string | null;
    courseGrade: string | null;
  }>>`
    SELECT
      id,
      course_name AS "courseName",
      coursera_course_id AS "courseraCourseId",
      coursera_course_slug AS "courseraCourseSlug",
      university,
      program_slug AS "programSlug",
      program_name AS "programName",
      overall_progress AS "overallProgress",
      learning_hours AS "learningHours",
      is_completed AS "isCompleted",
      enrollment_time AS "enrollmentTime",
      last_activity_time AS "lastActivityTime",
      completion_time AS "completionTime",
      certificate_url AS "certificateUrl",
      course_grade AS "courseGrade"
    FROM coursera_course_progress
    WHERE user_id = ${userId}
    ORDER BY last_activity_time DESC NULLS LAST, enrollment_time DESC NULLS LAST
  `;

  return rows.map((row) => ({
    ...row,
    overallProgress: Number(row.overallProgress) || 0,
    learningHours: Number(row.learningHours) || 0,
  }));
}

async function loadBadgesForUserId(userId: string): Promise<LearnerBadgeRow[]> {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    badgeTitle: string;
    badgeSlug: string;
    badgeLink: string | null;
    numberOfCourses: number;
    coursesCompleted: number;
    progressPercent: string | number;
    currentCourseName: string | null;
    badgeCompleted: boolean;
    badgeCompletionTime: Date | null;
    lastActivityTime: Date | null;
    totalLearningHours: string | number;
  }>>`
    SELECT
      id,
      badge_title AS "badgeTitle",
      badge_slug AS "badgeSlug",
      badge_link AS "badgeLink",
      number_of_courses AS "numberOfCourses",
      courses_completed AS "coursesCompleted",
      progress_percent AS "progressPercent",
      current_course_name AS "currentCourseName",
      badge_completed AS "badgeCompleted",
      badge_completion_time AS "badgeCompletionTime",
      last_activity_time AS "lastActivityTime",
      total_learning_hours AS "totalLearningHours"
    FROM coursera_badge_progress
    WHERE user_id = ${userId}
    ORDER BY progress_percent DESC, last_activity_time DESC NULLS LAST
  `;

  return rows.map((row) => ({
    ...row,
    numberOfCourses: Number(row.numberOfCourses) || 0,
    coursesCompleted: Number(row.coursesCompleted) || 0,
    progressPercent: Number(row.progressPercent) || 0,
    totalLearningHours: Number(row.totalLearningHours) || 0,
  }));
}

/**
 * Variant of loadLearnerProgressByUserId for unmatched learners — keyed by raw
 * Coursera email rather than a WAP user id. Used by the drill-down at
 * /admin/coursera/learners/unmatched/[externalEmailHash] for learners that have
 * not been bound yet.
 */
export async function loadLearnerProgressByExternalEmail(
  externalEmail: string
): Promise<LearnerProgressDetail | null> {
  try {
    const lower = externalEmail.toLowerCase();

    const courses = await prisma.$queryRaw<Array<{
      id: string;
      externalEmail: string;
      externalName: string | null;
      courseName: string;
      courseraCourseId: string;
      courseraCourseSlug: string | null;
      university: string | null;
      programSlug: string;
      programName: string | null;
      overallProgress: string | number;
      learningHours: string | number;
      isCompleted: boolean;
      enrollmentTime: Date | null;
      lastActivityTime: Date | null;
      completionTime: Date | null;
      certificateUrl: string | null;
      courseGrade: string | null;
    }>>`
      SELECT
        id,
        external_email AS "externalEmail",
        external_name AS "externalName",
        course_name AS "courseName",
        coursera_course_id AS "courseraCourseId",
        coursera_course_slug AS "courseraCourseSlug",
        university,
        program_slug AS "programSlug",
        program_name AS "programName",
        overall_progress AS "overallProgress",
        learning_hours AS "learningHours",
        is_completed AS "isCompleted",
        enrollment_time AS "enrollmentTime",
        last_activity_time AS "lastActivityTime",
        completion_time AS "completionTime",
        certificate_url AS "certificateUrl",
        course_grade AS "courseGrade"
      FROM coursera_course_progress
      WHERE LOWER(external_email) = ${lower}
      ORDER BY last_activity_time DESC NULLS LAST, enrollment_time DESC NULLS LAST
    `;

    const badges = await prisma.$queryRaw<Array<{
      id: string;
      externalName: string | null;
      badgeTitle: string;
      badgeSlug: string;
      badgeLink: string | null;
      numberOfCourses: number;
      coursesCompleted: number;
      progressPercent: string | number;
      currentCourseName: string | null;
      badgeCompleted: boolean;
      badgeCompletionTime: Date | null;
      lastActivityTime: Date | null;
      totalLearningHours: string | number;
    }>>`
      SELECT
        id,
        external_name AS "externalName",
        badge_title AS "badgeTitle",
        badge_slug AS "badgeSlug",
        badge_link AS "badgeLink",
        number_of_courses AS "numberOfCourses",
        courses_completed AS "coursesCompleted",
        progress_percent AS "progressPercent",
        current_course_name AS "currentCourseName",
        badge_completed AS "badgeCompleted",
        badge_completion_time AS "badgeCompletionTime",
        last_activity_time AS "lastActivityTime",
        total_learning_hours AS "totalLearningHours"
      FROM coursera_badge_progress
      WHERE LOWER(external_email) = ${lower}
      ORDER BY progress_percent DESC, last_activity_time DESC NULLS LAST
    `;

    if (courses.length === 0 && badges.length === 0) return null;

    const externalName = courses[0]?.externalName ?? badges[0]?.externalName ?? null;

    return {
      externalEmail: lower,
      externalName,
      user: null,
      courses: courses.map((row) => ({
        id: row.id,
        courseName: row.courseName,
        courseraCourseId: row.courseraCourseId,
        courseraCourseSlug: row.courseraCourseSlug,
        university: row.university,
        programSlug: row.programSlug,
        programName: row.programName,
        overallProgress: Number(row.overallProgress) || 0,
        learningHours: Number(row.learningHours) || 0,
        isCompleted: row.isCompleted,
        enrollmentTime: row.enrollmentTime,
        lastActivityTime: row.lastActivityTime,
        completionTime: row.completionTime,
        certificateUrl: row.certificateUrl,
        courseGrade: row.courseGrade,
      })),
      badges: badges.map((row) => ({
        id: row.id,
        badgeTitle: row.badgeTitle,
        badgeSlug: row.badgeSlug,
        badgeLink: row.badgeLink,
        numberOfCourses: Number(row.numberOfCourses) || 0,
        coursesCompleted: Number(row.coursesCompleted) || 0,
        progressPercent: Number(row.progressPercent) || 0,
        currentCourseName: row.currentCourseName,
        badgeCompleted: row.badgeCompleted,
        badgeCompletionTime: row.badgeCompletionTime,
        lastActivityTime: row.lastActivityTime,
        totalLearningHours: Number(row.totalLearningHours) || 0,
      })),
    };
  } catch (error) {
    console.error('[admin/coursera] failed to load unmatched learner detail:', error);
    return null;
  }
}
