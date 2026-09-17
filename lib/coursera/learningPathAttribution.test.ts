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
  assert.equal(
    bySpelledName?.programSlug,
    'cybersecurity-professional-certificate-google',
    'the combined Net+/Sec+ path is WAP\'s own combined program',
  );
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
    // CompTIA A+ path row under a collection id the registry does not carry
    // (as if Coursera had re-created the path since the Curriculum download).
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
  assert.equal(resolveReportCollection(batch[2], index), null, 'a named but unknown collection is never guessed');
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
  // Touker: "Introduction to Networking" is in both the Network+ collection and
  // the combined Net+/Sec+ collection; the row's collection id decides.
  const introToNetworking = 'N0l8fiV4Ee6DuxLo8f8SVQ';
  const underCombined = resolveReportCollection({ contentId: introToNetworking, collectionId: '81uci' });
  assert.equal(underCombined?.path.learningPathId, NET_SEC_PATH);
  assert.equal(underCombined?.programSlug, 'cybersecurity-professional-certificate-google');
  assert.equal(underCombined?.inferred, false);
  assert.equal(
    resolveReportCollection({ contentId: introToNetworking, collectionId: 'LVE2h' })?.programSlug,
    'comptia-network-professional-certificate',
  );
  assert.equal(
    resolveReportCollection({ contentId: introToNetworking }),
    null,
    'without a collection on the row a shared course is not attributed',
  );
});

test('a row with no collection falls back to curated membership only when one collection lists the course', () => {
  // Project Management Fundamentals is listed by the Microsoft PM collection alone.
  const inferred = resolveReportCollection({ contentId: 'Course~lgy789C8Ee6SjxKHxThXWw', collectionId: null, collectionName: '' });
  assert.equal(inferred?.programSlug, 'project-management-professional-certificate-microsoft');
  assert.equal(inferred?.path.collectionId, '1cvGr');
  assert.equal(inferred?.inferred, true);

  // "Introduction to Artificial Intelligence (AI)" is in both AI collections.
  assert.equal(resolveReportCollection({ contentId: 'mR7MlUaTEemuHQ4HpHozrA' }), null);
  // A course Coursera does not list anywhere.
  assert.equal(resolveReportCollection({ contentId: 'zzzzzzzzzzzzzzzzzzzzzz' }), null);
  // The row's own collection always wins over membership, even when unknown.
  assert.equal(resolveReportCollection({ contentId: 'lgy789C8Ee6SjxKHxThXWw', collectionId: 'unkn0' }), null);
  assert.equal(
    resolveReportCollection({ contentId: 'lgy789C8Ee6SjxKHxThXWw', collectionId: '0lodU' })?.programSlug,
    'it-support-professional-certificate-ibm',
  );
  // A collection-only registry entry (no path id yet) still resolves by collection.
  assert.equal(
    resolveReportCollection({ contentId: '76WGD1CXEe6T2Q7n3ko4Dw', collectionId: 'tEMYo' })?.programSlug,
    'it-support-and-entry-level-cyber-security-certificate',
  );
});

test('raw progress program: path > collection > course target > umbrella', () => {
  const fallbackProgramSlug = 'workforce-advancement-project-8a3f0';
  const knownPath = matchLearningPathReport({ contentId: IT_SUPPORT_PATH })!;
  // A path B4B reports that the registry has never heard of stays unresolved.
  const unresolvedPath = matchLearningPathReport({ contentId: 'yyyyyyyyyyyyyyyyyyyyyy', contentType: 'Specialization' })!;
  assert.equal(unresolvedPath.known, false);

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
