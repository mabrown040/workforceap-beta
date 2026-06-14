import { describe, expect, test } from 'vitest';
import {
  flattenXapiStatementPayload,
  isXapiCompletionVerb,
  isXapiCourseProgressVerb,
  parseXapiStatement,
} from './statementModel';

describe('xapi statement model', () => {
  test('flattenXapiStatementPayload: single object and array', () => {
    const one = { id: 'a' };
    expect(flattenXapiStatementPayload(one).length).toBe(1);
    expect(flattenXapiStatementPayload([one, { id: 'b' }]).length).toBe(2);
    expect(flattenXapiStatementPayload(null).length).toBe(0);
  });

  test('parseXapiStatement: mbox email, verb, course slug, progress percent', () => {
    const parsed = parseXapiStatement({
      id: 'stmt-1',
      actor: { mbox: 'mailto:Learner@Example.COM' },
      verb: { id: 'http://adlnet.gov/expapi/verbs/progressed' },
      object: {
        id: 'https://www.coursera.org/learn/my-course-slug',
        definition: { name: { 'en-US': 'My Course' } },
      },
      result: { progress: 0.33 },
    });
    expect(parsed).toBeTruthy();
    expect(parsed!.email).toBe('learner@example.com');
    expect(parsed!.statementId).toBe('stmt-1');
    expect(parsed!.verbId).toBe('http://adlnet.gov/expapi/verbs/progressed');
    expect(parsed!.courseSlug).toBe('my-course-slug');
    expect(parsed!.resultProgressPercent).toBe(33);
  });

  test('isXapiCompletionVerb and isXapiCourseProgressVerb', () => {
    const progressed = parseXapiStatement({
      id: 'p',
      actor: { mbox: 'mailto:a@b.co' },
      verb: { id: 'http://adlnet.gov/expapi/verbs/progressed' },
      object: {
        id: 'https://x/y',
        definition: { type: 'http://adlnet.gov/expapi/activities/course' },
      },
    });
    expect(progressed).toBeTruthy();
    expect(isXapiCompletionVerb(progressed!)).toBe(false);
    expect(isXapiCourseProgressVerb(progressed!)).toBe(true);

    const completed = parseXapiStatement({
      id: 'c',
      actor: { mbox: 'mailto:a@b.co' },
      verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
      object: {
        id: 'https://x/y',
        definition: { type: 'http://adlnet.gov/expapi/activities/course' },
      },
    });
    expect(completed).toBeTruthy();
    expect(isXapiCompletionVerb(completed!)).toBe(true);
    expect(isXapiCourseProgressVerb(completed!)).toBe(true);

    const legacyUnknownCompletion = parseXapiStatement({
      id: 'legacy-itemish',
      actor: { mbox: 'mailto:a@b.co' },
      verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
      object: { id: 'https://www.coursera.org/learn/my-course-slug/lecture/abc123' },
    });
    expect(legacyUnknownCompletion).toBeTruthy();
    expect(isXapiCompletionVerb(legacyUnknownCompletion!)).toBe(false);
    expect(isXapiCourseProgressVerb(legacyUnknownCompletion!)).toBe(false);
  });
});
