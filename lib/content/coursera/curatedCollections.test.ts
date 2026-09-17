import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CURATED_COLLECTIONS,
  CURATED_COLLECTIONS_SOURCE,
  SHARED_CURATED_COURSE_IDS,
  curatedCollectionsForCourse,
  findCuratedCollection,
  isCuratedCourseInCollection,
  uniqueCuratedCollectionForCourse,
} from './curatedCollections';
import { CURATED_COURSE_ID } from './curatedCollectionsCsv';

test('the generated module is the 2026-09-17 Curriculum download: 16 collections, 172 course rows, 159 courses', () => {
  assert.equal(CURATED_COLLECTIONS_SOURCE.programId, 'TpIlAogTQ8-SJQKIE8PP9w');
  assert.equal(CURATED_COLLECTIONS_SOURCE.exportedAt, '2026-09-17T22:05:40.249Z');
  assert.equal(CURATED_COLLECTIONS.length, 16);
  const rows = CURATED_COLLECTIONS.flatMap((collection) => collection.courses);
  assert.equal(rows.length, 172);
  assert.equal(CURATED_COLLECTIONS_SOURCE.courseRows, rows.length);
  assert.equal(new Set(rows.map((course) => course.courseId)).size, 159);
  for (const course of rows) {
    assert.match(course.courseId, CURATED_COURSE_ID);
    assert.ok(course.slug && course.name && course.partner, `${course.courseId} is missing slug, name or partner`);
  }
  for (const collection of CURATED_COLLECTIONS) {
    assert.match(collection.collectionId, /^[A-Za-z0-9]{5}$/);
    assert.ok(collection.courses.length >= 3, `${collection.collectionId} has only ${collection.courses.length} courses`);
  }
});

test('thirteen courses are shared by two collections and are never attributed by membership', () => {
  assert.equal(SHARED_CURATED_COURSE_IDS.length, 13);
  for (const courseId of SHARED_CURATED_COURSE_IDS) {
    assert.equal(curatedCollectionsForCourse(courseId).length, 2, courseId);
    assert.equal(uniqueCuratedCollectionForCourse(courseId), null, courseId);
  }
  // "Introduction to Artificial Intelligence (AI)" sits in both AI paths.
  assert.deepEqual(
    curatedCollectionsForCourse('mR7MlUaTEemuHQ4HpHozrA').map((collection) => collection.collectionId).sort(),
    ['0TmQl', '6m4yZ'],
  );
  // "Introduction to Networking" sits in Network+ and the combined Net+/Sec+ path.
  assert.deepEqual(
    curatedCollectionsForCourse('N0l8fiV4Ee6DuxLo8f8SVQ').map((collection) => collection.collectionId).sort(),
    ['81uci', 'LVE2h'],
  );
});

test('membership lookups normalize the Course~ prefix and answer by collection', () => {
  const pmFundamentals = 'lgy789C8Ee6SjxKHxThXWw';
  assert.equal(uniqueCuratedCollectionForCourse(pmFundamentals)?.collectionId, '1cvGr');
  assert.equal(uniqueCuratedCollectionForCourse(`Course~${pmFundamentals}`)?.collectionId, '1cvGr');
  assert.equal(isCuratedCourseInCollection(pmFundamentals, '1cvGr'), true);
  assert.equal(isCuratedCourseInCollection(pmFundamentals, '0lodU'), false);
  assert.equal(isCuratedCourseInCollection(pmFundamentals, null), false);
  assert.equal(uniqueCuratedCollectionForCourse('zzzzzzzzzzzzzzzzzzzzzz'), null);
  assert.equal(uniqueCuratedCollectionForCourse(''), null);
  assert.equal(findCuratedCollection('81uci')?.courses.length, 18);
  assert.equal(findCuratedCollection(' 81uci ')?.name, 'Networking and Cybersecurity Professional Certificate (CompTIA Net+,Sec+)');
  assert.equal(findCuratedCollection('nope'), null);
});
