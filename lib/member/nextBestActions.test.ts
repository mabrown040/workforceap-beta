import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNextBestActions } from './nextBestActions';

test('buildNextBestActions prioritizes new application on file', () => {
  const actions = buildNextBestActions({
    state: 'A',
    noApplicationOnFile: true,
    enrolledProgram: null,
    assessmentCompleted: false,
    starterProfileReviewRequired: false,
    hasResume: false,
    hasCompletedInterviewPractice: false,
    profileCompletenessPct: 20,
    jobApplicationCount: 0,
    counselorUnreadCount: 0,
    weeklyRecapUnopened: false,
  });
  assert.equal(actions[0]?.id, 'submit_application');
});

test('buildNextBestActions prioritizes counselor unread when application exists', () => {
  const actions = buildNextBestActions({
    state: 'C',
    noApplicationOnFile: false,
    enrolledProgram: 'ai-software',
    assessmentCompleted: true,
    starterProfileReviewRequired: false,
    hasResume: true,
    hasCompletedInterviewPractice: false,
    profileCompletenessPct: 80,
    jobApplicationCount: 2,
    counselorUnreadCount: 3,
    weeklyRecapUnopened: false,
  });
  assert.equal(actions[0]?.id, 'counselor_messages');
});

test('buildNextBestActions suggests tracker when eligible and no applications', () => {
  const actions = buildNextBestActions({
    state: 'D',
    noApplicationOnFile: false,
    enrolledProgram: 'ai-software',
    assessmentCompleted: true,
    starterProfileReviewRequired: false,
    hasResume: true,
    hasCompletedInterviewPractice: false,
    profileCompletenessPct: 90,
    jobApplicationCount: 0,
    counselorUnreadCount: 0,
    weeklyRecapUnopened: false,
  });
  assert.ok(actions.some((a) => a.id === 'job_tracker'));
});

test('buildNextBestActions adds state-D readiness actions', () => {
  const actions = buildNextBestActions({
    state: 'D',
    noApplicationOnFile: false,
    enrolledProgram: 'ai-software',
    assessmentCompleted: true,
    starterProfileReviewRequired: false,
    hasResume: true,
    hasCompletedInterviewPractice: false,
    profileCompletenessPct: 90,
    jobApplicationCount: 1,
    counselorUnreadCount: 0,
    weeklyRecapUnopened: false,
  });

  assert.ok(actions.some((a) => a.id === 'interview_practice'));
  assert.ok(actions.some((a) => a.id === 'career_readiness'));
});

test('buildNextBestActions routes missing resume to resume rewriter', () => {
  const actions = buildNextBestActions({
    state: 'D',
    noApplicationOnFile: false,
    enrolledProgram: 'ai-software',
    assessmentCompleted: true,
    starterProfileReviewRequired: false,
    hasResume: false,
    hasCompletedInterviewPractice: false,
    profileCompletenessPct: 90,
    jobApplicationCount: 1,
    counselorUnreadCount: 0,
    weeklyRecapUnopened: false,
  });

  const resumeAction = actions.find((a) => a.id === 'upload_resume');
  assert.equal(resumeAction?.href, '/dashboard/ai-tools/resume-rewriter');
});

test('buildNextBestActions prioritizes starter profile review for counselor-created members', () => {
  const actions = buildNextBestActions({
    state: 'B',
    noApplicationOnFile: false,
    enrolledProgram: 'it-support',
    assessmentCompleted: false,
    starterProfileReviewRequired: true,
    starterProfileMissingFields: ['ZIP code', 'referral source'],
    hasResume: false,
    hasCompletedInterviewPractice: false,
    profileCompletenessPct: 40,
    jobApplicationCount: 0,
    counselorUnreadCount: 0,
    weeklyRecapUnopened: false,
  });

  assert.equal(actions[0]?.id, 'review_starter_profile');
  assert.equal(actions[0]?.href, '/dashboard/profile');
});

test('buildNextBestActions hides interview practice after true completion', () => {
  const actions = buildNextBestActions({
    state: 'D',
    noApplicationOnFile: false,
    enrolledProgram: 'ai-software',
    assessmentCompleted: true,
    starterProfileReviewRequired: false,
    hasResume: true,
    hasCompletedInterviewPractice: true,
    profileCompletenessPct: 90,
    jobApplicationCount: 1,
    counselorUnreadCount: 0,
    weeklyRecapUnopened: false,
  });

  assert.ok(!actions.some((a) => a.id === 'interview_practice'));
});
