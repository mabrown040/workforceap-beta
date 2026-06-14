import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deriveCareerPlanSignal } from './careerPlanSignal';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-14T12:00:00.000Z');

const snapshot = {
  source: 'career_quiz',
  typeSlug: 'investigative-social',
  typeLabel: 'Investigative & Social',
  topCareer: { code: '29-1141.00', title: 'Registered Nurse' },
  programSlugs: ['healthcare'],
  selectedProgramSlug: 'healthcare',
  createdAt: new Date(NOW.getTime() - 2 * DAY_MS).toISOString(),
};

describe('deriveCareerPlanSignal', () => {
  it('returns null when the member has no quiz snapshot or career-plan application data', () => {
    assert.equal(
      deriveCareerPlanSignal({
        careerRecommendationJson: null,
        applications: [{ status: 'PENDING', submittedAt: null, recommendedCareerTitle: null, programRankedSlugs: ['generic-program'] }],
        events: [],
        enrolledProgram: null,
        activeCourseCount: 0,
        progressPercent: 0,
        now: NOW,
      }),
      null,
    );
  });

  it('flags a high-intent saved plan with no application after 24h', () => {
    const signal = deriveCareerPlanSignal({
      careerRecommendationJson: snapshot,
      applications: [],
      events: [{ eventName: 'career_plan_saved', createdAt: new Date(NOW.getTime() - 26 * 60 * 60 * 1000), metadata: {} }],
      enrolledProgram: null,
      activeCourseCount: 0,
      progressPercent: 0,
      now: NOW,
    });

    assert.deepEqual(signal, {
      typeLabel: 'Investigative & Social',
      topCareerTitle: 'Registered Nurse',
      selectedProgramSlug: 'healthcare',
      stage: 'plan_saved',
      committedAt: new Date(NOW.getTime() - 26 * 60 * 60 * 1000),
      shareCount: 0,
      staffAction: 'Call: high-intent plan saved but no application after 24h',
    });
  });

  it('surfaces quiz-result metadata even before a saved plan or application exists', () => {
    const signal = deriveCareerPlanSignal({
      careerRecommendationJson: null,
      applications: [],
      events: [
        {
          eventName: 'career_quiz_result_viewed',
          createdAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
          metadata: {
            typeLabel: 'Investigative & Social',
            topCareerTitle: 'Registered Nurse',
            programSlugs: ['healthcare'],
          },
        },
      ],
      enrolledProgram: null,
      activeCourseCount: 0,
      progressPercent: 0,
      now: NOW,
    });

    assert.equal(signal?.stage, 'quiz_result');
    assert.equal(signal?.typeLabel, 'Investigative & Social');
    assert.equal(signal?.topCareerTitle, 'Registered Nurse');
    assert.equal(signal?.selectedProgramSlug, 'healthcare');
    assert.equal(signal?.staffAction, 'Review: quiz result viewed; invite them to save the plan and start training');
  });

  it('uses application-started events when the plan entered the signup path but is not submitted', () => {
    const signal = deriveCareerPlanSignal({
      careerRecommendationJson: snapshot,
      applications: [],
      events: [
        {
          eventName: 'career_plan_application_started',
          createdAt: new Date(NOW.getTime() - 3 * 60 * 60 * 1000),
          metadata: { topCareerTitle: 'Registered Nurse', selectedProgramSlug: 'healthcare' },
        },
      ],
      enrolledProgram: null,
      activeCourseCount: 0,
      progressPercent: 0,
      now: NOW,
    });

    assert.equal(signal?.stage, 'application_started');
    assert.equal(signal?.staffAction, 'Text: application started from plan but not submitted');
    assert.equal(signal?.selectedProgramSlug, 'healthcare');
  });

  it('uses application data when the plan entered the signup path but is not submitted', () => {
    const signal = deriveCareerPlanSignal({
      careerRecommendationJson: snapshot,
      applications: [{ status: 'PENDING', submittedAt: null, recommendedCareerTitle: 'Registered Nurse', programRankedSlugs: ['healthcare'] }],
      events: [],
      enrolledProgram: null,
      activeCourseCount: 0,
      progressPercent: 0,
      now: NOW,
    });

    assert.equal(signal?.stage, 'application_started');
    assert.equal(signal?.staffAction, 'Text: application started from plan but not submitted');
    assert.equal(signal?.selectedProgramSlug, 'healthcare');
  });

  it('nudges enrolled members who have not started course 1', () => {
    const signal = deriveCareerPlanSignal({
      careerRecommendationJson: snapshot,
      applications: [{ status: 'APPROVED', submittedAt: new Date(NOW.getTime() - DAY_MS), recommendedCareerTitle: 'Registered Nurse', programRankedSlugs: ['healthcare'] }],
      events: [],
      enrolledProgram: 'healthcare',
      activeCourseCount: 0,
      progressPercent: 0,
      now: NOW,
    });

    assert.equal(signal?.stage, 'application_submitted');
    assert.equal(signal?.staffAction, 'Nudge: enrolled but course 1 not started');
  });

  it('marks members with course activity as training started and counts commitment shares', () => {
    const signal = deriveCareerPlanSignal({
      careerRecommendationJson: { ...snapshot, shareCount: 1 },
      applications: [{ status: 'APPROVED', submittedAt: new Date(NOW.getTime() - DAY_MS), recommendedCareerTitle: 'Registered Nurse', programRankedSlugs: ['healthcare'] }],
      events: [{ eventName: 'career_plan_commitment_shared', createdAt: new Date(NOW.getTime() - DAY_MS), metadata: { shareChannel: 'clipboard' } }],
      enrolledProgram: 'healthcare',
      activeCourseCount: 1,
      progressPercent: 5,
      now: NOW,
    });

    assert.equal(signal?.stage, 'training_started');
    assert.equal(signal?.shareCount, 2);
    assert.equal(signal?.staffAction, 'Celebrate: training started from saved career plan');
  });
});
