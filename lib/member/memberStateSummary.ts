import { Application, User, Profile } from '@prisma/client';
import { getProfileCompleteness, getProfileMissingFields } from '@/lib/resume/profileCompleteness';
import { buildMemberApplicationStatusView, MemberApplicationStatusView } from '@/lib/member/memberApplicationStatus';
import { getProgramBySlug, Program } from '@/lib/content/programs';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';

export type MemberStateSummary = {
  firstName: string;
  profilePct: number;
  profileMissingFields: string[];
  applicationStatus: MemberApplicationStatusView | null;
  enrolledProgram: Program | null;
  coursesCompletedCount: number;
  totalCoursesCount: number;
  trainingProgressPct: number;
  allCoursesComplete: boolean;
  dashboardState: 'A' | 'B' | 'C' | 'D';
  checklist: {
    createAccount: boolean;
    chooseProgram: boolean;
    completeAssessment: boolean;
    startFirstCourse: boolean;
    completeFirstCourse: boolean;
  };
  checklistAllDone: boolean;
  isMinor: boolean;
};

export function getMemberStateSummary(
  user: User & { profile: Profile | null },
  latestApplication: Application | null
): MemberStateSummary {
  const firstName = user.fullName?.split(' ')[0] ?? 'there';
  
  // 1. Profile Completeness
  const profilePct = getProfileCompleteness(user.profile, user);
  const profileMissingFields = getProfileMissingFields(user.profile, user);

  // 2. Application Status
  const applicationStatus = buildMemberApplicationStatusView(latestApplication, {
    enrolledProgram: user.enrolledProgram,
    enrolledAt: user.enrolledAt,
    assessmentCompleted: user.assessmentCompleted,
  });

  // 3. Program & Training
  const program = user.enrolledProgram ? getProgramBySlug(user.enrolledProgram) ?? null : null;
  const coursesCompleted = parseCourseSlugList(user.coursesCompleted);
  const totalCourses = program?.courses.length ?? 0;
  const completedCount = program
    ? coursesCompleted.filter((slug) => program.courses.some((c) => c.slug === slug)).length
    : 0;
  const allCoursesComplete = totalCourses > 0 && completedCount >= totalCourses;
  const trainingProgressPct = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;

  // 4. Dashboard State
  // A: Not enrolled, B: Enrolled but no assessment, C: In training, D: Training complete
  const dashboardState: 'A' | 'B' | 'C' | 'D' = !user.enrolledProgram
    ? 'A'
    : !user.assessmentCompleted
      ? 'B'
      : allCoursesComplete
        ? 'D'
        : 'C';

  // 5. Checklist
  const checklist = {
    createAccount: true,
    chooseProgram: !!user.enrolledProgram,
    completeAssessment: user.assessmentCompleted,
    startFirstCourse: !!user.enrolledProgram && user.assessmentCompleted,
    completeFirstCourse: completedCount >= 1,
  };
  const checklistAllDone = Object.values(checklist).every(Boolean);

  // 6. Minor Check
  const userAge = user.profile?.dob 
    ? Math.floor((Date.now() - new Date(user.profile.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const isMinor = user.profile?.isMinor || (userAge !== null && userAge < 18);

  return {
    firstName,
    profilePct,
    profileMissingFields,
    applicationStatus,
    enrolledProgram: program,
    coursesCompletedCount: completedCount,
    totalCoursesCount: totalCourses,
    trainingProgressPct,
    allCoursesComplete,
    dashboardState,
    checklist,
    checklistAllDone,
    isMinor,
  };
}
