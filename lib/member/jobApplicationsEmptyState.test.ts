import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JOB_APPLICATIONS_EMPTY } from './jobApplicationsEmptyState';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('job applications empty copy is honest and actionable', () => {
  assert.equal(JOB_APPLICATIONS_EMPTY.title, 'No applications yet');
  assert.ok(JOB_APPLICATIONS_EMPTY.description.length <= 140);
  assert.match(JOB_APPLICATIONS_EMPTY.description, /job board/i);
  assert.equal(JOB_APPLICATIONS_EMPTY.primaryCta.label, 'Add application');
  assert.equal(JOB_APPLICATIONS_EMPTY.secondaryCta.href, '/dashboard/jobs');
  assert.doesNotMatch(JOB_APPLICATIONS_EMPTY.description, /check back soon/i);
  assert.doesNotMatch(JOB_APPLICATIONS_EMPTY.description, /coming soon/i);
});

test('job applications tracker uses KitEmptyState and shared empty copy', () => {
  const src = readFileSync(join(ROOT, 'components/portal/JobApplicationsTracker.tsx'), 'utf8');
  assert.match(src, /KitEmptyState/);
  assert.match(src, /JOB_APPLICATIONS_EMPTY/);
  assert.match(src, /wa-kit-cta/);
  assert.doesNotMatch(src, /PortalEmptyState/);
  assert.doesNotMatch(src, /--color-on-surface/);
  assert.doesNotMatch(src, /--color-accent/);
});

test('job applications page uses kit tokens and i18n PageHeader', () => {
  const src = readFileSync(
    join(ROOT, 'app/(portal)/dashboard/job-applications/page.tsx'),
    'utf8',
  );
  assert.match(src, /DesignSurface/);
  assert.match(src, /jobApplicationsMetaTitle/);
  assert.match(src, /--wa-/);
  assert.doesNotMatch(src, /--color-on-surface/);
});
