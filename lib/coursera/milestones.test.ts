import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  deriveTrainingMilestoneTruth,
  detectMilestoneTransitions,
  hasValidatedTrainingStarted,
} from './milestones';

const validatedSlugs = ['course-1', 'course-2', 'course-3', 'course-4'];

describe('detectMilestoneTransitions', () => {
  it('does not treat off-syllabus activity as validated training started', () => {
    const offSyllabusActivity = [{
      courseSlug: 'off-syllabus',
      status: 'IN_PROGRESS',
      percentComplete: 50,
      lastActivityAt: new Date('2026-08-29T12:00:00Z'),
    }];
    assert.equal(
      hasValidatedTrainingStarted({
        rows: offSyllabusActivity,
        validatedSlugs,
      }),
      false,
    );
    assert.equal(
      hasValidatedTrainingStarted({
        rows: [
          ...offSyllabusActivity,
          {
            courseSlug: 'course-1',
            status: 'IN_PROGRESS',
            percentComplete: 1,
            lastActivityAt: null,
          },
        ],
        validatedSlugs,
      }),
      true,
    );
  });

  it('derives completion only from validated course slugs', () => {
    assert.deepEqual(
      deriveTrainingMilestoneTruth({
        completedSlugs: ['course-1', 'off-syllabus'],
        started: true,
        validatedSlugs,
      }),
      {
        trainingStarted: true,
        firstCourseCompleted: true,
        programHalfway: false,
        programCompleted: false,
        completedCount: 1,
        totalCourses: 4,
      },
    );
  });
  it('emits the locked Y=4 milestone sequence from validated completions', () => {
    assert.deepEqual(
      detectMilestoneTransitions({
        previous: { completedSlugs: [], started: false },
        next: { completedSlugs: [], started: true, validatedSlugs },
      }),
      ['training_started'],
    );

    assert.deepEqual(
      detectMilestoneTransitions({
        previous: { completedSlugs: [], started: true },
        next: { completedSlugs: ['course-1'], started: true, validatedSlugs },
        courseSlugJustCompleted: 'course-1',
      }),
      ['first_course_completed', 'course_completed'],
    );

    assert.deepEqual(
      detectMilestoneTransitions({
        previous: { completedSlugs: ['course-1'], started: true },
        next: {
          completedSlugs: ['course-1', 'course-2'],
          started: true,
          validatedSlugs,
        },
        courseSlugJustCompleted: 'course-2',
      }),
      ['course_completed', 'program_halfway'],
    );

    assert.deepEqual(
      detectMilestoneTransitions({
        previous: { completedSlugs: ['course-1', 'course-2'], started: true },
        next: {
          completedSlugs: ['course-1', 'course-2', 'course-3'],
          started: true,
          validatedSlugs,
        },
        courseSlugJustCompleted: 'course-3',
      }),
      ['course_completed'],
    );

    assert.deepEqual(
      detectMilestoneTransitions({
        previous: {
          completedSlugs: ['course-1', 'course-2', 'course-3'],
          started: true,
        },
        next: { completedSlugs: validatedSlugs, started: true, validatedSlugs },
        courseSlugJustCompleted: 'course-4',
      }),
      ['course_completed', 'program_completed'],
    );
  });

  it('ignores completions outside the validated syllabus', () => {
    assert.deepEqual(
      detectMilestoneTransitions({
        previous: { completedSlugs: [], started: true },
        next: {
          completedSlugs: ['off-syllabus'],
          started: true,
          validatedSlugs,
        },
        courseSlugJustCompleted: 'off-syllabus',
      }),
      [],
    );
  });
});
