import test from 'node:test';
import assert from 'node:assert/strict';

import { PROGRAMS } from '@/lib/content/programs';
import {
  computeJourneyStage,
  type JourneyMemberData,
} from './memberJourney';

const program = PROGRAMS.find((candidate) => candidate.courses.length >= 2);
if (!program) throw new Error('test fixture requires a multi-course program');
const programFixture = program;

function memberWithCompletedCount(coursesCompleted: number): JourneyMemberData {
  return {
    id: 'member-1',
    fullName: 'Member One',
    email: 'member@example.com',
    phone: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    assessmentCompleted: false,
    assessmentCompletedAt: null,
    enrolledProgram: programFixture.slug,
    wioaQualificationJson: null,
    wioaReviewStatus: null,
    wioaReviewedAt: null,
    profile: null,
    courseEnrollments: [{
      programSlug: programFixture.slug,
      fundingSource: null,
      enrolledAt: new Date('2026-01-02T00:00:00.000Z'),
    }],
    courseProgress: [],
    memberProgramProgress: [{ programSlug: programFixture.slug, coursesCompleted }],
    aiToolResults: [],
    placementRecord: null,
    counselorAssignments: [],
    memberEvents: [],
  };
}

test('journey reaches training complete only at exact validated X equals Y', () => {
  assert.equal(
    computeJourneyStage(memberWithCompletedCount(programFixture.courses.length)),
    'complete',
  );
  assert.equal(
    computeJourneyStage(memberWithCompletedCount(programFixture.courses.length - 1)),
    'coursera',
  );
  assert.equal(
    computeJourneyStage(memberWithCompletedCount(programFixture.courses.length + 1)),
    'coursera',
  );
});
