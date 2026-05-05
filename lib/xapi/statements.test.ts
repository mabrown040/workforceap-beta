import test from 'node:test';
import assert from 'node:assert/strict';
import {
  flattenXapiStatementPayload,
  isXapiCompletionVerb,
  isXapiCourseProgressVerb,
  parseXapiStatement,
} from './statementModel';

test('flattenXapiStatementPayload: single object and array', () => {
  const one = { id: 'a' };
  assert.equal(flattenXapiStatementPayload(one).length, 1);
  assert.equal(flattenXapiStatementPayload([one, { id: 'b' }]).length, 2);
  assert.equal(flattenXapiStatementPayload(null).length, 0);
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
  assert.ok(parsed);
  assert.equal(parsed.email, 'learner@example.com');
  assert.equal(parsed.statementId, 'stmt-1');
  assert.equal(parsed.verbId, 'http://adlnet.gov/expapi/verbs/progressed');
  assert.equal(parsed.courseSlug, 'my-course-slug');
  assert.equal(parsed.resultProgressPercent, 33);
});

test('isXapiCompletionVerb and isXapiCourseProgressVerb', () => {
  const progressed = parseXapiStatement({
    id: 'p',
    actor: { mbox: 'mailto:a@b.co' },
    verb: { id: 'http://adlnet.gov/expapi/verbs/progressed' },
    object: { id: 'https://x/y' },
  });
  assert.ok(progressed);
  assert.equal(isXapiCompletionVerb(progressed), false);
  assert.equal(isXapiCourseProgressVerb(progressed), true);

  const completed = parseXapiStatement({
    id: 'c',
    actor: { mbox: 'mailto:a@b.co' },
    verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
    object: { id: 'https://x/y' },
  });
  assert.ok(completed);
  assert.equal(isXapiCompletionVerb(completed), true);
  assert.equal(isXapiCourseProgressVerb(completed), true);
});
