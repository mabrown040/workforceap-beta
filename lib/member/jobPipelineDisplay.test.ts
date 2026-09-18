import test from 'node:test';
import assert from 'node:assert/strict';
import { displayJobLocation, JOBS_BOARD_EMPTY, JOBS_EMPTY_RECOMMENDATIONS } from './jobPipelineDisplay';

test('displayJobLocation uses a readable fallback instead of an em dash', () => {
  assert.equal(displayJobLocation(null), 'Location not listed');
  assert.equal(displayJobLocation(undefined), 'Location not listed');
  assert.equal(displayJobLocation(''), 'Location not listed');
  assert.equal(displayJobLocation('   '), 'Location not listed');
  assert.equal(displayJobLocation('—'), 'Location not listed');
  assert.equal(displayJobLocation('Austin, TX'), 'Austin, TX');
});

test('empty recommendations copy is a short next step, not a truncated paragraph', () => {
  assert.equal(JOBS_EMPTY_RECOMMENDATIONS.title, 'No matching roles yet');
  assert.ok(JOBS_EMPTY_RECOMMENDATIONS.description.length <= 72);
  assert.doesNotMatch(
    JOBS_EMPTY_RECOMMENDATIONS.description,
    /Keep your profile and certifications up to date and/,
  );
  assert.equal(JOBS_EMPTY_RECOMMENDATIONS.primaryCta, 'Update profile');
});

test('board inventory empty names next steps without promising seeded jobs', () => {
  assert.equal(JOBS_BOARD_EMPTY.title, 'No live openings right now');
  assert.match(JOBS_BOARD_EMPTY.description, /check back after new postings go live/i);
  assert.doesNotMatch(JOBS_BOARD_EMPTY.description, /\[Demo\]|seed|Capital Area/i);
  assert.equal(JOBS_BOARD_EMPTY.primaryCta, 'Update profile');
  assert.equal(JOBS_BOARD_EMPTY.secondaryCta, 'Message your counselor');
  assert.equal(JOBS_BOARD_EMPTY.primaryHref, '/dashboard/profile');
  assert.equal(JOBS_BOARD_EMPTY.secondaryHref, '/dashboard/messages');
});
