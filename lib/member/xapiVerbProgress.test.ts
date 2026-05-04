import test from 'node:test';
import assert from 'node:assert/strict';
import { CourseProgressStatus } from '@prisma/client';
import { inferCourseProgressStatusFromXapiVerb } from './xapiVerbProgress';
import type { ParsedXapiStatement } from '@/lib/xapi/statementModel';

function minimalParsed(overrides: Partial<ParsedXapiStatement>): ParsedXapiStatement {
  return {
    rawStatement: {},
    ...overrides,
  };
}

test('inferCourseProgressStatusFromXapiVerb: completion verb → COMPLETED', () => {
  const s = minimalParsed({
    verbId: 'http://adlnet.gov/expapi/verbs/completed',
  });
  assert.equal(inferCourseProgressStatusFromXapiVerb(s), CourseProgressStatus.COMPLETED);
});

test('inferCourseProgressStatusFromXapiVerb: progressed → IN_PROGRESS', () => {
  const s = minimalParsed({
    verbId: 'http://adlnet.gov/expapi/verbs/progressed',
  });
  assert.equal(inferCourseProgressStatusFromXapiVerb(s), CourseProgressStatus.IN_PROGRESS);
});

test('inferCourseProgressStatusFromXapiVerb: non-progress verb → null', () => {
  const s = minimalParsed({
    verbId: 'http://adlnet.gov/expapi/verbs/experienced',
  });
  assert.equal(inferCourseProgressStatusFromXapiVerb(s), null);
});
