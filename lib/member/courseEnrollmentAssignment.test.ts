import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { upsertEquivalentCourseEnrollment } from './courseEnrollmentAssignment';
import { APPROVED_CURRICULUM_VERSION } from '@/lib/content/programCurriculumManifest';

describe('equivalent CourseEnrollment assignment', () => {
  it('updates a retired alias row instead of creating a canonical duplicate', async () => {
    const calls: string[] = [];
    const tx = {
      courseEnrollment: {
        findMany: async () => [{
          id: 'alias-row',
          programSlug: 'management-and-data-analyst-professional-certificate-google-ibm',
          isPrimary: false,
        }],
        update: async ({ where, data }: { where: { id: string }; data: unknown }) => {
          calls.push(`update:${where.id}`);
          return { id: where.id, data };
        },
        upsert: async () => {
          calls.push('upsert');
          return { id: 'new-row' };
        },
      },
    };

    const row = await upsertEquivalentCourseEnrollment(
      tx as never,
      {
        userId: 'member-1',
        programSlug: 'data-analytics-professional-certificate-google',
        create: { organizationId: 'org-1', curriculumVersion: 'legacy-v1' },
        update: { isPrimary: true },
      },
    );

    assert.equal(row.id, 'alias-row');
    assert.deepEqual(calls, ['update:alias-row']);
  });

  it('creates a canonical row when no equivalent assignment exists', async () => {
    let createdProgramSlug = '';
    const tx = {
      courseEnrollment: {
        findMany: async () => [],
        update: async () => ({ id: 'unused' }),
        upsert: async (args: {
          create: { programSlug: string };
        }) => {
          createdProgramSlug = args.create.programSlug;
          return { id: 'new-row' };
        },
      },
    };

    await upsertEquivalentCourseEnrollment(
      tx as never,
      {
        userId: 'member-1',
        programSlug: 'management-and-data-analyst-professional-certificate-google-ibm',
        create: { organizationId: 'org-1', curriculumVersion: 'legacy-v1' },
        update: { isPrimary: true },
      },
    );

    assert.equal(
      createdProgramSlug,
      'data-analytics-professional-certificate-google',
    );
  });

  it('does not reinterpret a pre-versioning assignment as approved-v2', async () => {
    let createdCurriculumVersion = '';
    const tx = {
      courseEnrollment: {
        findMany: async () => [],
        update: async () => ({ id: 'unused' }),
        upsert: async (args: { create: { curriculumVersion: string } }) => {
          createdCurriculumVersion = args.create.curriculumVersion;
          return { id: 'legacy-row' };
        },
      },
      courseProgress: { count: async () => 0 },
      memberProgramProgress: { count: async () => 0 },
    };

    await upsertEquivalentCourseEnrollment(tx as never, {
      userId: 'member-1',
      programSlug: 'data-analytics-professional-certificate-google',
      preserveLegacyAssignment: true,
      create: {
        organizationId: 'org-1',
        curriculumVersion: APPROVED_CURRICULUM_VERSION,
      },
      update: { isPrimary: true },
    });

    assert.equal(createdCurriculumVersion, 'legacy-v1');
  });

  it('allows an explicit approved version for a clean canary learner', async () => {
    let createdCurriculumVersion = '';
    const tx = {
      courseEnrollment: {
        findMany: async () => [],
        update: async () => ({ id: 'unused' }),
        upsert: async (args: { create: { curriculumVersion: string } }) => {
          createdCurriculumVersion = args.create.curriculumVersion;
          return { id: 'canary-row' };
        },
      },
      courseProgress: { count: async () => 0 },
      memberProgramProgress: { count: async () => 0 },
    };

    await upsertEquivalentCourseEnrollment(tx as never, {
      userId: 'member-2',
      programSlug: 'data-analytics-professional-certificate-google',
      create: {
        organizationId: 'org-1',
        curriculumVersion: APPROVED_CURRICULUM_VERSION,
      },
      update: { isPrimary: true },
    });

    assert.equal(createdCurriculumVersion, APPROVED_CURRICULUM_VERSION);
  });

  it('preserves legacy when pre-versioning course progress exists without an enrollment row', async () => {
    let createdCurriculumVersion = '';
    const tx = {
      courseEnrollment: {
        findMany: async () => [],
        update: async () => ({ id: 'unused' }),
        upsert: async (args: { create: { curriculumVersion: string } }) => {
          createdCurriculumVersion = args.create.curriculumVersion;
          return { id: 'legacy-progress-row' };
        },
      },
      courseProgress: { count: async () => 1 },
      memberProgramProgress: { count: async () => 0 },
    };

    await upsertEquivalentCourseEnrollment(tx as never, {
      userId: 'member-3',
      programSlug: 'data-analytics-professional-certificate-google',
      create: {
        organizationId: 'org-1',
        curriculumVersion: APPROVED_CURRICULUM_VERSION,
      },
      update: { isPrimary: true },
    });

    assert.equal(createdCurriculumVersion, 'legacy-v1');
  });
});
