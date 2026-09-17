import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLearningPathIndex,
  findLearningPathByCollection,
  findLearningPathById,
} from '@/lib/content/coursera/learningPaths';
import {
  matchLearningPathReport,
  rawProgressProgramSlug,
  resolveReportCollection,
  withLearnedCollections,
} from './learningPathAttribution';

const IT_SUPPORT_PATH = 'o9PJJ-ReQ_KTySfkXuPyHw';
const IBM_AI_SOFTWARE_PATH = 'fT-1P-CkT6q_tT_gpM-qJw';
const NET_SEC_PATH = 'gCtwKvPFS36rcCrzxSt-Yg';
const COMPTIA_A_PATH = 'C-5mIgyaSLGuZiIMmrixWg';

test('looks a path up by id regardless of the Course~ / Specialization~ spelling', () => {
  for (const spelling of [IT_SUPPORT_PATH, `Course~${IT_SUPPORT_PATH}`, `Specialization~${IT_SUPPORT_PATH}`]) {
    assert.equal(findLearningPathById(spelling)?.programSlug, 'it-support-professional-certificate-ibm');
  }
  assert.equal(findLearningPathById('rNyuLa-pEeytqw64hz8ZCw'), null, 'a course id is not a path');
  assert.equal(findLearningPathById(''), null);
});

test('resolves a collection by id first, then by exact name, case-insensitively', () => {
  assert.equal(
    findLearningPathByCollection({ collectionId: '0lodU' })?.programSlug,
    'it-support-professional-certificate-ibm',
  );
  const bySpelledName = findLearningPathByCollection({
    collectionName: '  networking and cybersecurity professional certificate (comptia net+,sec+) ',
  });
  assert.equal(bySpelledName?.learningPathId, NET_SEC_PATH);
  assert.equal(bySpelledName?.programSlug, null, 'the combined Net+/Sec+ path has no WAP home yet');
  assert.equal(findLearningPathByCollection({ collectionId: 'nope1', collectionName: 'Nothing' }), null);
});

test('a registered path id is a path row whatever B4B labels it', () => {
  const match = matchLearningPathReport({
    contentId: IBM_AI_SOFTWARE_PATH,
    contentType: 'Course',
    contentName: 'AI and Software Developer Professional Certificate (IBM)',
  });
  assert.ok(match);
  assert.equal(match.known, true);
  assert.equal(match.programSlug, 'software-developer-professional-certificate-ibm');
});

test('an unregistered id is a path row only when B4B says so', () => {
  const unknownPath = matchLearningPathReport({
    contentId: 'zzzzzzzzzzzzzzzzzzzzzz',
    contentType: 'Specialization',
    contentName: 'Brand New Certificate',
  });
  assert.ok(unknownPath);
  assert.equal(unknownPath.known, false);
  assert.equal(unknownPath.programSlug, null);
  assert.equal(unknownPath.path.name, 'Brand New Certificate');

  assert.equal(
    matchLearningPathReport({ contentId: 'zzzzzzzzzzzzzzzzzzzzzz', contentType: 'Course' }),
    null,
    'a course row with an unknown id stays a course',
  );
});

test('learns a collection id only from a path row, never from a course row', () => {
  const batch = [
    // CompTIA A+ path row: registered, but the registry has no collection id for it yet.
    { contentId: COMPTIA_A_PATH, contentType: 'Specialization', collectionId: 'aAbBc' },
    // A course taken under that collection.
    { contentId: '7sBiclFIEeetjQ5ppGVTyA', contentType: 'Course', collectionId: 'aAbBc' },
    // A course under a collection no path row in the batch explains.
    { contentId: 'ySI6pmchEe--dw7PPVphLw', contentType: 'Course', collectionId: 'orph4' },
    // An unregistered path row teaches a synthetic, unresolved path.
    { contentId: 'yyyyyyyyyyyyyyyyyyyyyy', contentType: 'Specialization', contentName: 'New Path', collectionId: 'newC1' },
    { contentId: 'DRKQhcn7EfCGDQr_wTYZuQ', contentType: 'Course', collectionId: 'newC1' },
  ];
  const index = withLearnedCollections(batch);

  assert.equal(
    resolveReportCollection(batch[1], index)?.programSlug,
    'comptia-a-professional-certificate',
  );
  assert.equal(resolveReportCollection(batch[2], index), null);
  const synthetic = resolveReportCollection(batch[4], index);
  assert.ok(synthetic);
  assert.equal(synthetic.programSlug, null);
  assert.equal(synthetic.path.name, 'New Path');

  // Learning never mutates the shared default index.
  assert.equal(findLearningPathByCollection({ collectionId: 'aAbBc' }, buildLearningPathIndex()), null);
});

test('real feed rows: the certificate row is a path, the course row inherits its program', () => {
  // Belinda's two rows as the live sync stored them on 2026-09-17.
  const pathRow = {
    contentId: IT_SUPPORT_PATH,
    contentType: 'Specialization',
    contentName: 'IT Support Professional Certificate (IBM)',
    collectionId: '0lodU',
    collectionName: 'IT Support Professional Certificate (IBM)',
  };
  const courseRow = {
    contentId: 'rNyuLa-pEeytqw64hz8ZCw',
    contentType: 'Course',
    contentName: 'Introduction to Technical Support',
    collectionId: '0lodU',
    collectionName: 'IT Support Professional Certificate (IBM)',
  };
  const index = withLearnedCollections([pathRow, courseRow]);
  assert.equal(matchLearningPathReport(pathRow, index)?.programSlug, 'it-support-professional-certificate-ibm');
  assert.equal(matchLearningPathReport(courseRow, index), null);
  assert.equal(
    resolveReportCollection(courseRow, index)?.programSlug,
    'it-support-professional-certificate-ibm',
  );

  // Joseph: every course under the IBM AI + Software Developer collection.
  assert.equal(
    resolveReportCollection({ collectionId: '6m4yZ', collectionName: 'AI and Software Developer Professional Certificate (IBM)' })?.programSlug,
    'software-developer-professional-certificate-ibm',
  );
  // Touker: the combined Net+/Sec+ path resolves to a path but to no program.
  const netSec = resolveReportCollection({ collectionId: '81uci' });
  assert.equal(netSec?.path.learningPathId, NET_SEC_PATH);
  assert.equal(netSec?.programSlug, null);
});

test('raw progress program: path > collection > course target > umbrella', () => {
  const fallbackProgramSlug = 'workforce-advancement-project-8a3f0';
  const knownPath = matchLearningPathReport({ contentId: IT_SUPPORT_PATH })!;
  const unresolvedPath = matchLearningPathReport({ contentId: NET_SEC_PATH })!;

  assert.equal(
    rawProgressProgramSlug({ learningPath: knownPath, collectionProgramSlug: null, targetProgramSlug: 'other', fallbackProgramSlug }),
    'it-support-professional-certificate-ibm',
  );
  assert.equal(
    rawProgressProgramSlug({ learningPath: unresolvedPath, collectionProgramSlug: null, targetProgramSlug: 'other', fallbackProgramSlug }),
    fallbackProgramSlug,
    'an unresolved path never borrows a course target',
  );
  assert.equal(
    rawProgressProgramSlug({ learningPath: null, collectionProgramSlug: 'software-developer-professional-certificate-ibm', targetProgramSlug: 'ai-practitioner-professional-certificate-aws', fallbackProgramSlug }),
    'software-developer-professional-certificate-ibm',
  );
  assert.equal(
    rawProgressProgramSlug({ learningPath: null, collectionProgramSlug: null, targetProgramSlug: 'ai-practitioner-professional-certificate-aws', fallbackProgramSlug }),
    'ai-practitioner-professional-certificate-aws',
  );
  assert.equal(
    rawProgressProgramSlug({ learningPath: null, collectionProgramSlug: null, targetProgramSlug: undefined, fallbackProgramSlug }),
    fallbackProgramSlug,
  );
});
