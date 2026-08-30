import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  APPROVED_CURRICULUM_VERSION,
  LEGACY_CURRICULUM_VERSION,
} from '@/lib/content/programCurriculumManifest';
import { resolveInboundCourseScopes } from './resolveInboundCourseScopes';

describe('inbound provider course scopes', () => {
  it('routes an exact provider id to a secondary assigned curriculum', async () => {
    const scopes = await resolveInboundCourseScopes(
      {
        courseraCourseId: 'provider-course',
        assignments: [
          { programSlug: 'primary-program', curriculumVersion: LEGACY_CURRICULUM_VERSION },
          { programSlug: 'secondary-program', curriculumVersion: APPROVED_CURRICULUM_VERSION },
        ],
        fallbackProgramSlug: 'primary-program',
        fallbackCurriculumVersion: LEGACY_CURRICULUM_VERSION,
      },
      async () => ({
        status: 'matched_assignment',
        targets: [{
          courseraCourseId: 'provider-course',
          programSlug: 'secondary-program',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
          courseSlug: 'secondary-course',
        }],
      }),
    );
    assert.deepEqual(scopes, [{
      programSlug: 'secondary-program',
      curriculumVersion: APPROVED_CURRICULUM_VERSION,
      assignmentMatched: true,
    }]);
  });

  it('fans a shared id into every exact assigned curriculum', async () => {
    const scopes = await resolveInboundCourseScopes(
      {
        courseraCourseId: 'shared-provider-course',
        assignments: [
          { programSlug: 'program-a', curriculumVersion: APPROVED_CURRICULUM_VERSION },
          { programSlug: 'program-b', curriculumVersion: LEGACY_CURRICULUM_VERSION },
        ],
        fallbackProgramSlug: 'program-a',
        fallbackCurriculumVersion: APPROVED_CURRICULUM_VERSION,
      },
      async () => ({
        status: 'matched_assignment',
        targets: [
          {
            courseraCourseId: 'shared-provider-course',
            programSlug: 'program-a',
            curriculumVersion: APPROVED_CURRICULUM_VERSION,
            courseSlug: 'course-a',
          },
          {
            courseraCourseId: 'shared-provider-course',
            programSlug: 'program-b',
            curriculumVersion: LEGACY_CURRICULUM_VERSION,
            courseSlug: 'course-b',
          },
        ],
      }),
    );
    assert.deepEqual(scopes.map((scope) => scope.programSlug), ['program-a', 'program-b']);
  });

  it('fails closed instead of falling back to primary when an exact id misses assignments', async () => {
    const scopes = await resolveInboundCourseScopes(
      {
        courseraCourseId: 'unknown-provider-course',
        assignments: [{ programSlug: 'primary-program', curriculumVersion: LEGACY_CURRICULUM_VERSION }],
        fallbackProgramSlug: 'primary-program',
        fallbackCurriculumVersion: LEGACY_CURRICULUM_VERSION,
      },
      async () => ({ status: 'unmapped', targets: [] }),
    );
    assert.deepEqual(scopes, []);
  });

  it('keeps primary fallback only when no provider id is present', async () => {
    const scopes = await resolveInboundCourseScopes({
      assignments: [{ programSlug: 'primary-program', curriculumVersion: LEGACY_CURRICULUM_VERSION }],
      fallbackProgramSlug: 'primary-program',
      fallbackCurriculumVersion: LEGACY_CURRICULUM_VERSION,
    });
    assert.deepEqual(scopes, [{
      programSlug: 'primary-program',
      curriculumVersion: LEGACY_CURRICULUM_VERSION,
      assignmentMatched: true,
    }]);
  });
});
