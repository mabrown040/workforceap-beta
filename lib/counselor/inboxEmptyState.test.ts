import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNSELOR_INBOX_ZERO_EMPTY,
  COUNSELOR_MESSAGES_FILTER_EMPTY,
  COUNSELOR_MESSAGES_NO_MEMBERS_EMPTY,
} from './inboxEmptyState';

test('inbox-zero empty copy is kit-ready with actionable CTAs', () => {
  assert.equal(COUNSELOR_INBOX_ZERO_EMPTY.title, 'Inbox zero');
  assert.ok(COUNSELOR_INBOX_ZERO_EMPTY.description.length <= 120);
  assert.equal(COUNSELOR_INBOX_ZERO_EMPTY.primaryCta, 'Open messages');
  assert.equal(COUNSELOR_INBOX_ZERO_EMPTY.secondaryCta, 'Back to dashboard');
  assert.equal(COUNSELOR_INBOX_ZERO_EMPTY.primaryHref, '/counselor/messages');
  assert.equal(COUNSELOR_INBOX_ZERO_EMPTY.secondaryHref, '/counselor');
  assert.doesNotMatch(COUNSELOR_INBOX_ZERO_EMPTY.description, /check back soon/i);
});

test('messages no-members empty names the assignment gap and points at roster', () => {
  assert.equal(COUNSELOR_MESSAGES_NO_MEMBERS_EMPTY.title, 'No members assigned yet');
  assert.ok(COUNSELOR_MESSAGES_NO_MEMBERS_EMPTY.description.length <= 90);
  assert.equal(COUNSELOR_MESSAGES_NO_MEMBERS_EMPTY.primaryCta, 'Browse all members');
  assert.equal(COUNSELOR_MESSAGES_NO_MEMBERS_EMPTY.primaryHref, '/counselor/students');
  assert.doesNotMatch(COUNSELOR_MESSAGES_NO_MEMBERS_EMPTY.description, /check back soon/i);
});

test('messages filter empty offers a clear-filters next step', () => {
  assert.equal(COUNSELOR_MESSAGES_FILTER_EMPTY.title, 'No conversations match');
  assert.equal(COUNSELOR_MESSAGES_FILTER_EMPTY.clearCta, 'Clear filters');
});
