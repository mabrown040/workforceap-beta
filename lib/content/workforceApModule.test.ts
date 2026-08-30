import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  APPROVED_CURRICULUM_VERSION,
  APPROVED_PROGRAM_CURRICULA,
} from './programCurriculumManifest';
import { resolveWorkforceApModule } from './workforceApModule';

describe('WorkforceAP approved modules', () => {
  it('gives every local approved curriculum item a real module route target', () => {
    const localCourses = APPROVED_PROGRAM_CURRICULA.flatMap((manifest) =>
      manifest.courses
        .filter((course) => course.kind === 'workforceap')
        .map((course) => ({ manifest, course })),
    );
    assert.equal(localCourses.length, 2);

    for (const { manifest, course } of localCourses) {
      assert.deepEqual(
        resolveWorkforceApModule({
          programSlug: manifest.programSlug,
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
          courseSlug: course.slug,
        }),
        course,
      );
    }
  });

  it('refuses provider courses and courses outside the pinned version', () => {
    assert.equal(
      resolveWorkforceApModule({
        programSlug: 'ux-design-professional-certificate-google',
        curriculumVersion: APPROVED_CURRICULUM_VERSION,
        courseSlug: 'foundations-user-experience-design',
      }),
      null,
    );
    assert.equal(
      resolveWorkforceApModule({
        programSlug: 'ux-design-professional-certificate-google',
        curriculumVersion: 'legacy-v1',
        courseSlug: 'ux-ui-lab-project-test-preparation',
      }),
      null,
    );
  });
});
