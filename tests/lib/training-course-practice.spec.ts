import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProgramBySlug } from '@/lib/content/programs';
import { getProgramCoursesForCurriculumVersion } from '@/lib/member/curriculumAssignment';
import { getSkillMissionDefinitionsForProgram } from '@/lib/content/skillMissionCatalog';
import { loadSkillMissionSummary } from '@/lib/member/skillMissions';
import { loadTrainingCoursePractice } from '@/lib/member/trainingCoursePractice';
import type { TrainingWorkspace } from '@/lib/member/trainingWorkspace';

vi.mock('@/lib/member/skillMissions', () => ({ loadSkillMissionSummary: vi.fn() }));
const program = getProgramBySlug('it-support-professional-certificate-ibm')!;
const workspace: TrainingWorkspace = {
  programSlug: program.slug, programTitle: program.title, curriculumVersion: 'legacy-v1',
  weeklyHours: null, planStartDate: null, planUpdatedAt: null, totalEstimatedHours: 160, publishedSyllabusHours: 160,
  courses: getProgramCoursesForCurriculumVersion(program, 'legacy-v1').map((course) => ({ ...course, notes: '', artifactUrl: null, updatedAt: null })),
};
const missions = getSkillMissionDefinitionsForProgram(program.slug).map((definition) => ({
  ...definition, quizQuestions: definition.quizQuestions.map(({ text, options }) => ({ text, options })),
  status: 'ready' as const, completedAt: null, latestResult: null, aiToolResultId: null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadSkillMissionSummary).mockResolvedValue({ programSlug: program.slug, missions } as never);
});

describe('course practice assignment projection', () => {
  it('loads own-user, version-specific results and attaches only exact assigned courses', async () => {
    const result = await loadTrainingCoursePractice({ userId: 'own-member', workspace, completedCourseSlugs: [workspace.courses[0].slug] });
    expect(loadSkillMissionSummary).toHaveBeenCalledExactlyOnceWith({ userId: 'own-member', programSlug: program.slug, curriculumVersion: 'legacy-v1', completedCourseSlugs: [workspace.courses[0].slug] });
    expect(result).toHaveLength(7);
    expect(result[0].assignedCourseSlug).toBe('introduction-to-technical-support');
    expect(result.some((row) => row.assignedCourseSlug === 'it-support-course-7')).toBe(false);
    expect(result.find((row) => row.assignedCourseSlug === 'technical-support-case-studies')?.mission.courseSlug).toBe('it-support-course-7');
    expect(result.some((row) => row.assignedCourseSlug === 'it-support-professional-certificate-ibm-course-10')).toBe(false);
    for (const row of result) for (const question of row.mission.quizQuestions) {
      expect(question).not.toHaveProperty('correctIndex');
      expect(question).not.toHaveProperty('explanation');
    }
  });

  it('does not attach another program or a missing practice summary', async () => {
    vi.mocked(loadSkillMissionSummary).mockResolvedValueOnce({ programSlug: 'another-program', missions } as never);
    expect(await loadTrainingCoursePractice({ userId: 'own-member', workspace, completedCourseSlugs: [] })).toEqual([]);
    vi.mocked(loadSkillMissionSummary).mockResolvedValueOnce(null);
    expect(await loadTrainingCoursePractice({ userId: 'own-member', workspace, completedCourseSlugs: [] })).toEqual([]);
  });
});
