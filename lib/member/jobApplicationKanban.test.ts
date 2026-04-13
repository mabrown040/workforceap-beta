import assert from 'node:assert/strict';
import test from 'node:test';

import { buildJobApplicationKanban, getJobApplicationStage } from './jobApplicationKanban';

test('getJobApplicationStage maps legacy statuses into the four kanban columns', () => {
  assert.equal(getJobApplicationStage('SAVED'), 'APPLIED');
  assert.equal(getJobApplicationStage('APPLIED'), 'APPLIED');
  assert.equal(getJobApplicationStage('PHONE_SCREEN'), 'INTERVIEWING');
  assert.equal(getJobApplicationStage('INTERVIEWING'), 'INTERVIEWING');
  assert.equal(getJobApplicationStage('OFFER'), 'OFFER');
  assert.equal(getJobApplicationStage('REJECTED'), 'CLOSED');
});

test('buildJobApplicationKanban groups applications into Applied, Interviewing, Offer, and Closed', () => {
  const grouped = buildJobApplicationKanban([
    { id: '1', status: 'SAVED', createdAt: new Date('2026-03-20T00:00:00Z') },
    { id: '2', status: 'INTERVIEWING', createdAt: new Date('2026-03-21T00:00:00Z') },
    { id: '3', status: 'OFFER', createdAt: new Date('2026-03-22T00:00:00Z') },
    { id: '4', status: 'REJECTED', createdAt: new Date('2026-03-23T00:00:00Z') },
  ]);

  assert.deepEqual(grouped.APPLIED.map((item) => item.id), ['1']);
  assert.deepEqual(grouped.INTERVIEWING.map((item) => item.id), ['2']);
  assert.deepEqual(grouped.OFFER.map((item) => item.id), ['3']);
  assert.deepEqual(grouped.CLOSED.map((item) => item.id), ['4']);
});
