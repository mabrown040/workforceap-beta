import { getProgramBySlug, type Program, type ProgramCourse } from '@/lib/content/programs';
import { canonicalizeProgramSlug } from '@/lib/content/programSlug';
import { getLevelForPoints, POINT_VALUES } from '@/lib/member/pointsConfig';

export type DemoMemberProgressInput = {
  program: string;
  coursesCompleted: string[];
  assessmentScore: number | null;
  status: string;
};

export type DemoPointsEvent = {
  event: string;
  entityId: string;
  points: number;
};

export type DemoProgressPlan = {
  programSlug: string;
  programTitle: string | null;
  partner: string | null;
  completedCourses: ProgramCourse[];
  remainingCourses: ProgramCourse[];
  allCourses: ProgramCourse[];
  coursesCompletedCount: number;
  averagePercent: number;
  pointsEvents: DemoPointsEvent[];
  totalPoints: number;
  level: string;
  awardCertificate: boolean;
};

function normalizeCourseLabel(value: string): string {
  return value
    .replace(/^module\s+\d+\s*:\s*/i, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function matchCompletedCatalogCourses(
  program: Program,
  completedNames: string[],
): ProgramCourse[] {
  if (completedNames.length === 0 || program.courses.length === 0) return [];

  const remaining = [...program.courses];
  const matched: ProgramCourse[] = [];

  for (const name of completedNames) {
    const needle = normalizeCourseLabel(name);
    if (!needle) continue;
    const index = remaining.findIndex((course) => {
      const haystack = normalizeCourseLabel(course.name);
      return haystack === needle || haystack.includes(needle) || needle.includes(haystack);
    });
    if (index >= 0) {
      matched.push(remaining.splice(index, 1)[0]!);
    }
  }

  if (matched.length === 0) {
    return program.courses.slice(0, Math.min(completedNames.length, program.courses.length));
  }
  return matched;
}

export function planDemoMemberPoints(args: {
  completedCourseSlugs: string[];
  assessmentScore: number | null;
  status: string;
  dailyStudyDays?: number;
}): { events: DemoPointsEvent[]; totalPoints: number; level: string } {
  const events: DemoPointsEvent[] = [];
  if (args.assessmentScore !== null) {
    events.push({
      event: 'assessment_completed',
      entityId: 'demo-assessment',
      points: POINT_VALUES.assessment_completed,
    });
  }
  events.push({
    event: 'program_enrolled',
    entityId: 'demo-enrollment',
    points: POINT_VALUES.program_enrolled,
  });
  for (const slug of args.completedCourseSlugs) {
    events.push({
      event: 'course_completed',
      entityId: slug,
      points: POINT_VALUES.course_completed,
    });
  }
  if (args.status === 'certified' || args.status === 'placed') {
    events.push({
      event: 'certification_earned',
      entityId: 'demo-cert',
      points: POINT_VALUES.certification_earned,
    });
  }
  if (args.status === 'placed') {
    events.push({
      event: 'placement_recorded',
      entityId: 'demo-placement',
      points: POINT_VALUES.placement_recorded,
    });
  }
  const studyDays = args.dailyStudyDays ?? Math.min(5, Math.max(0, args.completedCourseSlugs.length));
  for (let i = 0; i < studyDays; i += 1) {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() - i);
    events.push({
      event: 'daily_study',
      entityId: day.toISOString().slice(0, 10),
      points: POINT_VALUES.daily_study,
    });
  }

  const totalPoints = events.reduce((sum, event) => sum + event.points, 0);
  return {
    events,
    totalPoints,
    level: getLevelForPoints(totalPoints).name,
  };
}

export function planDemoMemberProgress(input: DemoMemberProgressInput): DemoProgressPlan | null {
  const programSlug = canonicalizeProgramSlug(input.program);
  const program = getProgramBySlug(programSlug);
  if (!program) return null;

  const completedCourses = matchCompletedCatalogCourses(program, input.coursesCompleted);
  const completedSlugs = new Set(completedCourses.map((course) => course.slug));
  const remainingCourses = program.courses.filter((course) => !completedSlugs.has(course.slug));
  const points = planDemoMemberPoints({
    completedCourseSlugs: completedCourses.map((course) => course.slug),
    assessmentScore: input.assessmentScore,
    status: input.status,
  });

  return {
    programSlug: program.slug,
    programTitle: program.title,
    partner: program.partner,
    completedCourses,
    remainingCourses,
    allCourses: program.courses,
    coursesCompletedCount: completedCourses.length,
    averagePercent:
      program.courses.length === 0
        ? 0
        : Math.round((completedCourses.length / program.courses.length) * 100),
    pointsEvents: points.events,
    totalPoints: points.totalPoints,
    level: points.level,
    awardCertificate: input.status === 'certified' || input.status === 'placed',
  };
}
