import test from 'node:test';
import assert from 'node:assert/strict';

import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { PROGRAMS } from '@/lib/content/programs';
import { canonicalizeProgramSlug } from '@/lib/content/programSlug';
import {
  COURSERA_LEARNING_PATHS,
  KNOWN_LEARNING_PATH_IDS,
  findLearningPathById,
  isLearningPathContentType,
  learningPathProgramSlug,
  normalizeLearningPathName,
} from './learningPaths';

const PATH_ID = /^[A-Za-z0-9_-]{22}$/;

test('every registered path has a real 22-character id, unique ids, and unique collection ids', () => {
  const ids = COURSERA_LEARNING_PATHS.map((path) => path.learningPathId);
  assert.equal(new Set(ids).size, ids.length, 'duplicate learningPathId');
  for (const id of ids) assert.match(id, PATH_ID);
  assert.deepEqual([...KNOWN_LEARNING_PATH_IDS], ids);

  const collections = COURSERA_LEARNING_PATHS.flatMap((path) => (path.collectionId ? [path.collectionId] : []));
  assert.equal(new Set(collections).size, collections.length, 'duplicate collectionId');
});

test('every resolved path points at a canonical slug of a real WAP program', () => {
  const programSlugs = new Set(PROGRAMS.map((program) => program.slug));
  for (const path of COURSERA_LEARNING_PATHS) {
    if (path.programSlug === null) continue;
    assert.equal(canonicalizeProgramSlug(path.programSlug), path.programSlug, `${path.learningPathId} slug is not canonical`);
    assert.ok(programSlugs.has(path.programSlug), `${path.programSlug} is not in PROGRAMS`);
    assert.equal(learningPathProgramSlug(path), path.programSlug);
  }
});

test('exactly one path is unresolved, and it is the combined Net+/Sec+ path', () => {
  const unresolved = COURSERA_LEARNING_PATHS.filter((path) => path.programSlug === null);
  assert.deepEqual(unresolved.map((path) => path.learningPathId), ['gCtwKvPFS36rcCrzxSt-Yg']);
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

test('the Google Cybersecurity catalog entry no longer carries the Net+/Sec+ path id', () => {
  assert.equal(DISCOVERED_COURSERA_PROGRAMS['cybersecurity-professional-certificate-google']?.learningPathId, undefined);
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
