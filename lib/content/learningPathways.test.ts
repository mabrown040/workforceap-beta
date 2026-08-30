import assert from 'node:assert/strict';
import test from 'node:test';

import { getPathwayForProgram } from '@/lib/content/learningPathways';
import {
  APPROVED_CURRICULUM_VERSION,
  LEGACY_CURRICULUM_VERSION,
} from '@/lib/content/programCurriculumManifest';

const MANAGEMENT_PROGRAM_SLUG = 'data-analytics-professional-certificate-google';

test('member pathway steps follow the immutable curriculum assignment', () => {
  const legacy = getPathwayForProgram(
    MANAGEMENT_PROGRAM_SLUG,
    LEGACY_CURRICULUM_VERSION,
  );
  const approved = getPathwayForProgram(
    MANAGEMENT_PROGRAM_SLUG,
    APPROVED_CURRICULUM_VERSION,
  );

  assert.equal(legacy?.steps.length, 13);
  assert.equal(approved?.steps.length, 11);
  assert.notDeepEqual(approved?.steps, legacy?.steps);
});
