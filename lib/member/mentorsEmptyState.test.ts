import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MENTORS_ADMIN_EMPTY, MENTORS_MEMBER_EMPTY } from './mentorsEmptyState';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('member mentors empty copy is honest and actionable', () => {
  assert.equal(MENTORS_MEMBER_EMPTY.title, 'No mentors to request yet');
  assert.ok(MENTORS_MEMBER_EMPTY.description.length <= 140);
  assert.doesNotMatch(MENTORS_MEMBER_EMPTY.description, /check back soon/i);
  assert.doesNotMatch(MENTORS_MEMBER_EMPTY.description, /we're adding/i);
  assert.match(MENTORS_MEMBER_EMPTY.description, /counselor/i);
  assert.equal(MENTORS_MEMBER_EMPTY.statusTone, 'warn');
  assert.equal(MENTORS_MEMBER_EMPTY.primaryCta.href, '/dashboard/messages');
  assert.equal(MENTORS_MEMBER_EMPTY.secondaryCta.href, '/dashboard/jobs');
});

test('admin mentors empty points at the apply + approve path', () => {
  assert.equal(MENTORS_ADMIN_EMPTY.title, 'No mentors in the directory');
  assert.match(MENTORS_ADMIN_EMPTY.description, /approve/i);
  assert.equal(MENTORS_ADMIN_EMPTY.primaryCta.href, '/mentor/apply');
});

test('member mentors kit uses KitEmptyState and shared empty copy', () => {
  const src = readFileSync(
    join(ROOT, 'components/portal/kit/pages/member/MemberMentorsKit.tsx'),
    'utf8',
  );
  assert.match(src, /KitEmptyState/);
  assert.match(src, /MENTORS_MEMBER_EMPTY/);
  assert.match(src, /StatusTag/);
  assert.doesNotMatch(src, /Check back soon/);
  assert.doesNotMatch(src, /from '@astryxdesign\/core\/EmptyState'/);
});

test('admin mentors directory empty uses KitEmptyState', () => {
  const src = readFileSync(
    join(ROOT, 'components/portal/kit/pages/admin-subviews/MentorsDirectoryKit.tsx'),
    'utf8',
  );
  assert.match(src, /KitEmptyState/);
  assert.match(src, /MENTORS_ADMIN_EMPTY/);
  assert.doesNotMatch(src, /from '@astryxdesign\/core\/EmptyState'/);
});
