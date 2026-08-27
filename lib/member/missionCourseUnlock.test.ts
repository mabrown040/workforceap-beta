import assert from 'node:assert/strict';
import test from 'node:test';

import { getProgramBySlug } from '@/lib/content/programs';
import {
  isMissionCourseComplete,
  resolveMissionUnlockSlugs,
} from './missionCourseUnlock';

test('maps invented mission slugs to syllabus/Coursera slugs by course title', () => {
  const program = getProgramBySlug('comptia-a-professional-certificate');
  assert.ok(program);
  const slugs = resolveMissionUnlockSlugs({
    missionCourseSlug: 'comptia-a-course-1',
    missionCourseTitle: 'IT Fundamentals and Hardware Essentials',
    programCourses: program.courses,
  });
  assert.ok(slugs.includes('comptia-a-course-1'));
  assert.ok(slugs.includes('packt-it-fundamentals-and-hardware-essentials-yqged'));
});

test('unlocks when Coursera progress uses the syllabus slug, not the invented catalog slug', () => {
  const unlockSlugs = [
    'comptia-a-course-1',
    'packt-it-fundamentals-and-hardware-essentials-yqged',
  ];
  assert.equal(
    isMissionCourseComplete(unlockSlugs, ['packt-it-fundamentals-and-hardware-essentials-yqged']),
    true,
  );
  assert.equal(isMissionCourseComplete(unlockSlugs, ['some-other-course']), false);
  assert.equal(isMissionCourseComplete(unlockSlugs, []), false);
});
