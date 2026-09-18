import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EMPLOYERS_DIRECTORY_EMPTY,
  PARTNERS_DIRECTORY_EMPTY,
  SUBGROUPS_DIRECTORY_EMPTY,
} from './directoryEmptyState';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function assertSentenceCaseLabel(label: string) {
  assert.ok(label.length > 0);
  assert.match(label[0]!, /[A-Z]/);
  // No mid-string Title Case words (e.g. "Add Partner").
  assert.doesNotMatch(label.slice(1), /\s[A-Z]/);
}

test('partners directory empty is actionable and sentence-case', () => {
  assert.equal(PARTNERS_DIRECTORY_EMPTY.title, 'No partner organizations yet');
  assert.ok(PARTNERS_DIRECTORY_EMPTY.description.length <= 140);
  assert.equal(PARTNERS_DIRECTORY_EMPTY.primaryCta.href, '/admin/partners/new');
  assertSentenceCaseLabel(PARTNERS_DIRECTORY_EMPTY.primaryCta.label);
});

test('employers directory empty points at create path', () => {
  assert.equal(EMPLOYERS_DIRECTORY_EMPTY.title, 'No employers in the directory');
  assert.match(EMPLOYERS_DIRECTORY_EMPTY.description, /hiring partner/i);
  assert.equal(EMPLOYERS_DIRECTORY_EMPTY.primaryCta.href, '/admin/employers?ui=legacy#create');
  assertSentenceCaseLabel(EMPLOYERS_DIRECTORY_EMPTY.primaryCta.label);
});

test('subgroups directory empty points at new subgroup', () => {
  assert.equal(SUBGROUPS_DIRECTORY_EMPTY.title, 'No subgroups yet');
  assert.match(SUBGROUPS_DIRECTORY_EMPTY.description, /assigned members/i);
  assert.equal(SUBGROUPS_DIRECTORY_EMPTY.primaryCta.href, '/admin/subgroups/new');
  assertSentenceCaseLabel(SUBGROUPS_DIRECTORY_EMPTY.primaryCta.label);
});

test('partners directory kit uses KitEmptyState and shared empty copy', () => {
  const src = readFileSync(
    join(ROOT, 'components/portal/kit/pages/admin-subviews/PartnersDirectoryKit.tsx'),
    'utf8',
  );
  assert.match(src, /KitEmptyState/);
  assert.match(src, /PARTNERS_DIRECTORY_EMPTY/);
  assert.doesNotMatch(src, /from '@astryxdesign\/core\/EmptyState'/);
});

test('employers directory kit uses KitEmptyState and shared empty copy', () => {
  const src = readFileSync(
    join(ROOT, 'components/portal/kit/pages/admin-subviews/EmployersDirectoryKit.tsx'),
    'utf8',
  );
  assert.match(src, /KitEmptyState/);
  assert.match(src, /EMPLOYERS_DIRECTORY_EMPTY/);
  assert.doesNotMatch(src, /from '@astryxdesign\/core\/EmptyState'/);
});

test('subgroups directory kit uses KitEmptyState and shared empty copy', () => {
  const src = readFileSync(
    join(ROOT, 'components/portal/kit/pages/admin-subviews/SubgroupsDirectoryKit.tsx'),
    'utf8',
  );
  assert.match(src, /KitEmptyState/);
  assert.match(src, /SUBGROUPS_DIRECTORY_EMPTY/);
  assert.doesNotMatch(src, /from '@astryxdesign\/core\/EmptyState'/);
});
