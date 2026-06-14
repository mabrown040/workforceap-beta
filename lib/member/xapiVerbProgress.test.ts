import { describe, expect, test } from 'vitest';
import { CourseProgressStatus } from '@prisma/client';
import { inferCourseProgressStatusFromXapiVerb } from './xapiVerbProgress';
import type { ParsedXapiStatement } from '@/lib/xapi/statementModel';

function minimalParsed(overrides: Partial<ParsedXapiStatement>): ParsedXapiStatement {
  return {
    rawStatement: {},
    ...overrides,
  };
}

describe('inferCourseProgressStatusFromXapiVerb', () => {
  test('completion verb → COMPLETED', () => {
    const s = minimalParsed({
      activityType: 'course',
      verbId: 'http://adlnet.gov/expapi/verbs/completed',
    });
    expect(inferCourseProgressStatusFromXapiVerb(s)).toBe(CourseProgressStatus.COMPLETED);
  });

  test('progressed → IN_PROGRESS', () => {
    const s = minimalParsed({
      verbId: 'http://adlnet.gov/expapi/verbs/progressed',
    });
    expect(inferCourseProgressStatusFromXapiVerb(s)).toBe(CourseProgressStatus.IN_PROGRESS);
  });

  test('non-progress verb → null', () => {
    const s = minimalParsed({
      verbId: 'http://adlnet.gov/expapi/verbs/experienced',
    });
    expect(inferCourseProgressStatusFromXapiVerb(s)).toBeNull();
  });
});
