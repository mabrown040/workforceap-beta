/**
 * Skill Checkpoints — applied-scenario verification layer.
 *
 * A checkpoint is NOT a recall quiz. It is a short workplace scenario that
 * verifies a member can APPLY a skill a course teaches. Pass = the skill is
 * marked "demonstrated" (vs merely "studied"); fail = we point the member back
 * to the exact course that covers it.
 *
 * Content rules (member-first):
 * - 8th-grade reading level, mobile-first lengths (scenario <= 60 words).
 * - Workplace-realistic: phrased as a situation on the job, never trivia.
 * - Distractors must be plausible mistakes a beginner actually makes.
 * - No trick questions. One clearly best answer.
 * - Explanations teach: say WHY the right answer is right in one sentence,
 *   and what the wrong choices get wrong when useful.
 */

export interface CheckpointOption {
  id: 'a' | 'b' | 'c' | 'd';
  text: string;
}

export interface SkillCheckpoint {
  /** `${courseSlug}-cp-${n}` — stable, used as MemberEvent entityId */
  id: string;
  /** Course this checkpoint verifies (matches courseSlug in courseSkillMap.ts) */
  courseSlug: string;
  /** Program the course belongs to (programSlug in courseSkillMap.ts) */
  programSlug: string;
  /** Plain-language name of the skill being demonstrated, e.g. "Troubleshoot a network outage" */
  demonstratedSkill: string;
  /** O*NET skill names this maps to (subset of onetSkillsAddressed for the course) */
  onetSkills: string[];
  /** The workplace scenario (<= 60 words, second person, present tense) */
  scenario: string;
  /** The question asked about the scenario */
  question: string;
  options: CheckpointOption[];
  correctOptionId: CheckpointOption['id'];
  /** One-to-two sentence teaching explanation shown after answering */
  explanation: string;
  /** Difficulty within the course sequence */
  level: 'foundation' | 'applied' | 'job_ready';
}

export interface CourseCheckpointSet {
  courseSlug: string;
  courseName: string;
  programSlug: string;
  checkpoints: SkillCheckpoint[]; // 2-4 per course
}

export interface ProgramCheckpointPack {
  programSlug: string;
  programTitle: string;
  /** Why these checkpoints matter for this career, one member-facing sentence */
  whyItMatters: string;
  courses: CourseCheckpointSet[];
}
