import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNextBestActions } from './nextBestActions.ts';

test('buildNextBestActions prioritizes new application on file', () => {
  const actions = buildNextBestActions({
    state: 'A',
    noApplicationOnFile: true,
    enrolledProgram: null,
    assessmentCompleted: false,
    hasResume: false,
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
    hasResume: true,
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
    hasResume: true,
    profileCompletenessPct: 90,
    jobApplicationCount: 0,
    counselorUnreadCount: 0,
    weeklyRecapUnopened: false,
  });
  assert.ok(actions.some((a) => a.id === 'job_tracker'));
});
