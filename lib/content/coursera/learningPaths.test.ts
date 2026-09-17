import test from 'node:test';
import assert from 'node:assert/strict';

import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { PROGRAMS } from '@/lib/content/programs';
import { canonicalizeProgramSlug } from '@/lib/content/programSlug';
import { CURATED_COLLECTIONS, CURATED_COLLECTIONS_SOURCE } from './curatedCollections';
import {
  COURSERA_LEARNING_PATHS,
  KNOWN_LEARNING_PATH_COLLECTION_IDS,
  KNOWN_LEARNING_PATH_IDS,
  findLearningPathByCollection,
  findLearningPathById,
  isLearningPathContentType,
  learningPathProgramSlug,
  normalizeLearningPathName,
} from './learningPaths';

const PATH_ID = /^[A-Za-z0-9_-]{22}$/;
const NET_SEC_PATH = 'gCtwKvPFS36rcCrzxSt-Yg';

test('every path id is a real 22-character id, ids and collection ids are unique, and every entry has a collection id', () => {
  const ids = COURSERA_LEARNING_PATHS.flatMap((path) => (path.learningPathId ? [path.learningPathId] : []));
  assert.equal(new Set(ids).size, ids.length, 'duplicate learningPathId');
  for (const id of ids) assert.match(id, PATH_ID);
  assert.deepEqual([...KNOWN_LEARNING_PATH_IDS], ids);

  const collections = COURSERA_LEARNING_PATHS.map((path) => path.collectionId);
  for (const collectionId of collections) assert.match(collectionId, /^[A-Za-z0-9]{5}$/);
  assert.equal(new Set(collections).size, collections.length, 'duplicate collectionId');
  assert.deepEqual([...KNOWN_LEARNING_PATH_COLLECTION_IDS], collections);
});

test('every path points at a canonical slug of a real WAP program', () => {
  const programSlugs = new Set(PROGRAMS.map((program) => program.slug));
  for (const path of COURSERA_LEARNING_PATHS) {
    assert.ok(path.programSlug, `${path.collectionId} (${path.name}) has no WAP program`);
    assert.equal(canonicalizeProgramSlug(path.programSlug), path.programSlug, `${path.collectionId} slug is not canonical`);
    assert.ok(programSlugs.has(path.programSlug), `${path.programSlug} is not in PROGRAMS`);
    assert.equal(learningPathProgramSlug(path), path.programSlug);
  }
});

test('the combined Net+/Sec+ path is WAP\'s own combined program, not Network+ or Security+', () => {
  const combined = findLearningPathById(NET_SEC_PATH);
  assert.equal(combined?.programSlug, 'cybersecurity-professional-certificate-google');
  assert.equal(combined?.collectionId, '81uci');
  assert.equal(findLearningPathByCollection({ collectionId: 'LVE2h' })?.programSlug, 'comptia-network-professional-certificate');
  assert.equal(findLearningPathByCollection({ collectionId: 'sxbNZ' })?.programSlug, 'comptia-security-professional-certificate');
});

test('the only collection-only entry is the IT Support + Entry-Level Cybersecurity path, and it is reachable by collection', () => {
  const collectionOnly = COURSERA_LEARNING_PATHS.filter((path) => path.learningPathId === null);
  assert.deepEqual(collectionOnly.map((path) => path.collectionId), ['tEMYo']);
  assert.equal(
    findLearningPathByCollection({ collectionId: 'tEMYo' })?.programSlug,
    'it-support-and-entry-level-cyber-security-certificate',
  );
  assert.equal(
    findLearningPathByCollection({ collectionName: 'IT Support and Entry-Level Cybersecurity Professional Certificate (IBM)' })?.collectionId,
    'tEMYo',
  );
});

test('registry and the Curriculum download name the same sixteen collections, with matching display names', () => {
  assert.equal(CURATED_COLLECTIONS_SOURCE.programId, 'TpIlAogTQ8-SJQKIE8PP9w');
  const exported = new Map(CURATED_COLLECTIONS.map((collection) => [collection.collectionId, collection]));
  assert.equal(exported.size, COURSERA_LEARNING_PATHS.length, 'registry and export disagree on the number of collections');
  for (const path of COURSERA_LEARNING_PATHS) {
    const collection = exported.get(path.collectionId);
    assert.ok(collection, `registered collection ${path.collectionId} (${path.name}) is not in the Curriculum download`);
    const names = new Set([path.name, ...(path.aliases ?? [])].map(normalizeLearningPathName));
    assert.ok(
      names.has(normalizeLearningPathName(collection.name)),
      `${path.collectionId}: export calls it "${collection.name}", registry knows ${[...names].join(' | ')}`,
    );
    assert.equal(findLearningPathByCollection({ collectionName: collection.name }), path, `${collection.name} resolves by name`);
  }
});

test('agrees with courseraDiscoveredCatalog on every learningPathId it carries', () => {
  const keysByPathId = new Map<string, Set<string>>();
  for (const [key, program] of Object.entries(DISCOVERED_COURSERA_PROGRAMS)) {
    const pathId = program.learningPathId;
    if (!pathId) continue;
    const keys = keysByPathId.get(pathId) ?? new Set<string>();
    keys.add(canonicalizeProgramSlug(key));
    keysByPathId.set(pathId, keys);
  }
  assert.ok(keysByPathId.size > 0);
  for (const [pathId, keys] of keysByPathId) {
    const path = findLearningPathById(pathId);
    assert.ok(path, `catalog learningPathId ${pathId} is not registered`);
    assert.ok(
      path.programSlug !== null && keys.has(path.programSlug),
      `${pathId}: registry says ${path.programSlug}, catalog keys are ${[...keys].join(', ')}`,
    );
  }
});

test('the combined-program catalog entry carries the combined path id and its Google courses are in that collection', () => {
  const entry = DISCOVERED_COURSERA_PROGRAMS['cybersecurity-professional-certificate-google'];
  assert.equal(entry?.learningPathId, NET_SEC_PATH);
  const collection = CURATED_COLLECTIONS.find((candidate) => candidate.collectionId === '81uci');
  assert.ok(collection);
  const courseIds = new Set(collection.courses.map((course) => course.courseId));
  for (const course of entry.courses) {
    assert.ok(courseIds.has(course.courseId), `${course.courseId} (${course.name}) is not in collection 81uci`);
  }
});

test('recognizes path content types case-insensitively and normalizes names', () => {
  for (const type of ['Specialization', 'specialization', ' LearningPath ', 'learning_path', 's12n']) {
    assert.equal(isLearningPathContentType(type), true, type);
  }
  for (const type of ['Course', 'course', '', null, undefined]) {
    assert.equal(isLearningPathContentType(type), false, String(type));
  }
  assert.equal(normalizeLearningPathName('  AI   Practitioner  Professional Certificate '), 'ai practitioner professional certificate');
});
