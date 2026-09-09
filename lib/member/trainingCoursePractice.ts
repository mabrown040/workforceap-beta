import 'server-only';

import { loadSkillMissionSummary, type SkillMissionSummaryItem } from './skillMissions';
import { resolveSkillMissionsForCurriculum } from './skillMissionCurriculum';
import type { TrainingWorkspace } from './trainingWorkspace';

export type TrainingCoursePractice = { assignedCourseSlug: string; mission: SkillMissionSummaryItem };

/** Keep existing graded missions attached only to courses in this pinned workspace. */
export async function loadTrainingCoursePractice(args: {
  userId: string;
  workspace: TrainingWorkspace;
  completedCourseSlugs: string[];
}): Promise<TrainingCoursePractice[]> {
  const { workspace } = args;
  const summary = await loadSkillMissionSummary({
    userId: args.userId, programSlug: workspace.programSlug,
    curriculumVersion: workspace.curriculumVersion, completedCourseSlugs: args.completedCourseSlugs,
  });
  if (!summary || summary.programSlug !== workspace.programSlug) return [];
  const assigned = new Map(workspace.courses.map((course) => [course.slug, course]));
  const resolved = resolveSkillMissionsForCurriculum({ programSlug: workspace.programSlug, curriculumVersion: workspace.curriculumVersion });
  return resolved.flatMap((row) => {
    const course = assigned.get(row.assignedCourseSlug);
    if (!course) return [];
    const mission = summary.missions.find((candidate) => candidate.courseSlug === row.definition.courseSlug && candidate.programSlug === workspace.programSlug);
    // Catalog nicknames such as "Code Architect" obscure the actual topic.
    // Keep the grading identity/content; label practice with its assigned course.
    return mission ? [{ assignedCourseSlug: row.assignedCourseSlug, mission: { ...mission, missionName: `${course.name} practice` } }] : [];
  });
}
