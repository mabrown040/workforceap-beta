import test from 'node:test';
import assert from 'node:assert/strict';
import { humanizeCourseraCourseTitle, looksLikeCourseraSlug } from './courseTitle';

test('humanizeCourseraCourseTitle keeps real titles', () => {
  assert.equal(
    humanizeCourseraCourseTitle('Introduction to Technical Support'),
    'Introduction to Technical Support',
  );
});

test('humanizeCourseraCourseTitle title-cases slugs and drops vendor tokens', () => {
  assert.ok(looksLikeCourseraSlug('introduction-to-technical-support'));
  assert.equal(
    humanizeCourseraCourseTitle('introduction-to-technical-support'),
    'Introduction To Technical Support',
  );
  assert.equal(
    humanizeCourseraCourseTitle('it-support-professional-certificate-ibm'),
    'IT Support Professional Certificate',
  );
  assert.equal(humanizeCourseraCourseTitle('', 'google-it-support'), 'IT Support');
});

test('humanizeCourseraCourseTitle falls back for blank input', () => {
  assert.equal(humanizeCourseraCourseTitle(''), 'Untitled course');
  assert.equal(humanizeCourseraCourseTitle(null, null), 'Untitled course');
});
