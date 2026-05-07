import assert from 'node:assert/strict';
import { parseCompletionStatements } from '@/lib/xapi/statements';

const baseStatement = {
  id: 'stmt-1',
  actor: {
    mbox: 'mailto:member@example.com',
  },
  object: {
    id: 'https://www.coursera.org/learn/foundations-of-cybersecurity/home/welcome',
    definition: {
      name: { en: 'Foundations of Cybersecurity' },
    },
  },
};

const parsedDirect = parseCompletionStatements({
  ...baseStatement,
  verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
});
assert.equal(parsedDirect.length, 1);
assert.equal(parsedDirect[0]?.email, 'member@example.com');
assert.equal(parsedDirect[0]?.courseSlug, 'foundations-of-cybersecurity');

// xAPI Statement API envelope shape: { statements: [...] }
const parsedEnvelope = parseCompletionStatements({
  statements: [
    {
      ...baseStatement,
      verb: { display: { 'en-US': 'completed' } },
      result: { completion: 'true' },
    },
  ],
});
assert.equal(parsedEnvelope.length, 1);
assert.equal(parsedEnvelope[0]?.statementId, 'stmt-1');

// Course slug via definition extensions.
const parsedExtension = parseCompletionStatements({
  ...baseStatement,
  object: {
    id: 'urn:course:opaque-id',
    definition: {
      name: { en: 'Some Generic Name' },
      extensions: {
        'https://workforceap.org/xapi/courseSlug': 'custom-course-slug',
      },
    },
  },
  verb: { id: 'passed' },
});
assert.equal(parsedExtension.length, 1);
assert.equal(parsedExtension[0]?.courseSlug, 'custom-course-slug');

// Group actors with member list should still resolve email.
const parsedGroupActor = parseCompletionStatements({
  ...baseStatement,
  actor: {
    objectType: 'Group',
    member: [{ mbox: 'mailto:groupmember@example.com' }],
  },
  verb: { id: 'completed' },
});
assert.equal(parsedGroupActor.length, 1);
assert.equal(parsedGroupActor[0]?.email, 'groupmember@example.com');

// Non-completion statements should be ignored.
const parsedIgnored = parseCompletionStatements({
  ...baseStatement,
  verb: { id: 'http://adlnet.gov/expapi/verbs/attempted' },
});
assert.equal(parsedIgnored.length, 0);

console.log('xapi statements tests passed');
