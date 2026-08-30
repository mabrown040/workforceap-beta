import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isWorkforceApCourse, workforceApCourseHref } from './courseDelivery';

describe('training course delivery boundary', () => {
  it('keeps explicit WorkforceAP labs inside the portal', () => {
    const local = { slug: 'local-lab', kind: 'workforceap' as const };
    assert.equal(isWorkforceApCourse(local), true);
    assert.equal(
      workforceApCourseHref(local.slug, 'approved-program'),
      '/dashboard/learning/modules/local-lab?program=approved-program',
    );
  });

  it('keeps legacy and Coursera courses on the provider path', () => {
    assert.equal(isWorkforceApCourse({ slug: 'legacy-course' }), false);
    assert.equal(isWorkforceApCourse({ slug: 'provider-course', kind: 'coursera' }), false);
  });
});
