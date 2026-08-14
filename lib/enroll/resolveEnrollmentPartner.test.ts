import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enrollmentPathForSlug, enrollmentPathSegment } from './enrollmentPath';
import { enrollPageCopyIsStakeSafe } from './resolveEnrollmentPartner';

describe('enrollment path helpers', () => {
  it('shortens a high-school slug for the public URL', () => {
    assert.equal(enrollmentPathSegment('concordia-high-school'), 'concordia');
    assert.equal(enrollmentPathForSlug('concordia-high-school'), '/enroll/concordia');
  });

  it('leaves a non-high-school slug intact', () => {
    assert.equal(enrollmentPathSegment('riverside-academy'), 'riverside-academy');
    assert.equal(enrollmentPathForSlug('riverside-academy'), '/enroll/riverside-academy');
  });
});

describe('enroll page copy stake', () => {
  it('allows the locked no-cost sponsorship sentence', () => {
    assert.equal(
      enrollPageCopyIsStakeSafe(
        'Career training and certifications offered at no cost to Concordia High School students for 2026 — sponsored through the WorkforceAP–Concordia partnership.',
      ),
      true,
    );
  });

  it('rejects the banned word', () => {
    assert.equal(enrollPageCopyIsStakeSafe('Free career training for students'), false);
  });
});
