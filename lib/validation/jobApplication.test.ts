import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createJobApplicationSchema,
  updateJobApplicationSchema,
} from './jobApplication';

test('createJobApplicationSchema accepts required fields for a new application', () => {
  const parsed = createJobApplicationSchema.parse({
    jobTitle: 'IT Support Specialist',
    company: 'Techvera',
    applicationDate: '2026-03-28',
    source: 'INDEED',
  });

  assert.equal(parsed.jobTitle, 'IT Support Specialist');
  assert.equal(parsed.company, 'Techvera');
  assert.equal(parsed.source, 'INDEED');
});

test('createJobApplicationSchema requires a source', () => {
  const result = createJobApplicationSchema.safeParse({
    jobTitle: 'IT Support Specialist',
    company: 'Techvera',
    applicationDate: '2026-03-28',
  });

  assert.equal(result.success, false);
});

test('updateJobApplicationSchema allows patching status and notes only', () => {
  const parsed = updateJobApplicationSchema.parse({
    status: 'CLOSED',
    notes: 'Not selected',
  });

  assert.equal(parsed.status, 'CLOSED');
  assert.equal(parsed.notes, 'Not selected');
});
