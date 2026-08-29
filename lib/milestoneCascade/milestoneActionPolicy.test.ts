import assert from 'node:assert/strict';
import test from 'node:test';

import { filterMilestoneActions } from './milestoneActionPolicy';
import type { ActionDraft } from './types';

const celebration: ActionDraft = {
  type: 'celebrate_milestone',
  channel: 'email',
  subject: 'Progress update',
  body: 'You made progress.',
  rationale: 'Milestone reached',
  confidence: 1,
};
const counselorCall: ActionDraft = {
  type: 'flag_for_counselor_call',
  rationale: 'Review next steps',
  confidence: 0.8,
};

test('counselor-only milestones cannot retain member celebration emails', () => {
  assert.deepEqual(
    filterMilestoneActions('program_halfway', [celebration, counselorCall]),
    [counselorCall],
  );
  assert.deepEqual(filterMilestoneActions('training_started', [celebration]), []);
});

test('completion milestones may retain counselor-approved celebration drafts', () => {
  assert.deepEqual(
    filterMilestoneActions('course_completed', [celebration, counselorCall]),
    [celebration, counselorCall],
  );
});
