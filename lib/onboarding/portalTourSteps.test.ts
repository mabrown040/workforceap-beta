import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MEMBER_PORTAL_TOUR_STEPS,
  EMPLOYER_PORTAL_TOUR_STEPS,
  PARTNER_PORTAL_TOUR_STEPS,
} from './portalTourSteps';

test('MEMBER_PORTAL_TOUR_STEPS is a 3-step first-visit onboarding tour', () => {
  assert.ok(Array.isArray(MEMBER_PORTAL_TOUR_STEPS), 'Should be an array');
  assert.equal(MEMBER_PORTAL_TOUR_STEPS.length, 3, 'Member tour should have exactly 3 steps');
  assert.deepEqual(
    MEMBER_PORTAL_TOUR_STEPS.map((s) => s.targetId),
    ['tour-progress-card', 'tour-first-value', 'tour-coach']
  );

  for (const step of MEMBER_PORTAL_TOUR_STEPS) {
    assert.equal(typeof step.targetId, 'string', 'targetId must be a string');
    assert.equal(typeof step.title, 'string', 'title must be a string');
    assert.equal(typeof step.body, 'string', 'body must be a string');
    if (step.placement) {
      assert.ok(
        ['top', 'bottom', 'left', 'right'].includes(step.placement),
        `Invalid placement value: ${step.placement}`
      );
    }
  }
});

test('EMPLOYER_PORTAL_TOUR_STEPS is an array of valid TourStep objects', () => {
  assert.ok(Array.isArray(EMPLOYER_PORTAL_TOUR_STEPS), 'Should be an array');
  assert.ok(EMPLOYER_PORTAL_TOUR_STEPS.length > 0, 'Should not be empty');

  for (const step of EMPLOYER_PORTAL_TOUR_STEPS) {
    assert.equal(typeof step.targetId, 'string', 'targetId must be a string');
    assert.equal(typeof step.title, 'string', 'title must be a string');
    assert.equal(typeof step.body, 'string', 'body must be a string');
    if (step.placement) {
      assert.ok(
        ['top', 'bottom', 'left', 'right'].includes(step.placement),
        `Invalid placement value: ${step.placement}`
      );
    }
  }
});

test('PARTNER_PORTAL_TOUR_STEPS is an array of valid TourStep objects', () => {
  assert.ok(Array.isArray(PARTNER_PORTAL_TOUR_STEPS), 'Should be an array');
  assert.ok(PARTNER_PORTAL_TOUR_STEPS.length > 0, 'Should not be empty');

  for (const step of PARTNER_PORTAL_TOUR_STEPS) {
    assert.equal(typeof step.targetId, 'string', 'targetId must be a string');
    assert.equal(typeof step.title, 'string', 'title must be a string');
    assert.equal(typeof step.body, 'string', 'body must be a string');
    if (step.placement) {
      assert.ok(
        ['top', 'bottom', 'left', 'right'].includes(step.placement),
        `Invalid placement value: ${step.placement}`
      );
    }
  }
});
