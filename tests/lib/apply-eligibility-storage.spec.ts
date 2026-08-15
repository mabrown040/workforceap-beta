/**
 * BL1 — the `apply_eligibility` hand-off is the cross-student PII channel.
 *
 * Shared school-lab computers are the normal device for this funnel. Student A
 * (16) fills in step 1 — including their PARENT's name, email and phone — and
 * abandons at step 2. Student B sits down at the same machine and finishes.
 * Before this module, every one of A's invisible answers rode along on B's
 * signup: B's profile got `isMinor: true`, `parentalConsentGiven: false`, and
 * A's parent's contact details, which B could then read back out of their own
 * GDPR export. Nothing on any screen ever showed B any of it.
 *
 * Two independent guards, both asserted here: a 7-day TTL on the localStorage
 * mirror, and an ownership check against the email the person at the keyboard
 * actually typed.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import {
  APPLY_ELIGIBILITY_KEY,
  APPLY_ELIGIBILITY_TTL_MS,
  clearApplyEligibility,
  eligibilityPayloadMatchesEmail,
  readApplyEligibility,
  readApplyEligibilityForEmail,
  writeApplyEligibility,
  type ApplyEligibilityPayload,
} from '@/lib/apply/applyEligibilityStorage';

/** A minor's step-1 payload, guardian details and all. */
const STUDENT_A: ApplyEligibilityPayload = {
  firstName: 'Alex',
  lastName: 'Prior',
  email: 'alex.prior@example.com',
  ageGroup: 'under_18',
  county: 'Travis',
  variant: 'school',
  schoolSlug: 'concordia-hs',
  gradeLevel: '11',
  guardianName: 'Dana Guardian',
  guardianEmail: 'dana.guardian@example.com',
  guardianPhone: '5125550123',
};

function seedMirror(payload: Record<string, unknown>) {
  localStorage.setItem(APPLY_ELIGIBILITY_KEY, JSON.stringify(payload));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('writeApplyEligibility', () => {
  it('writes to both stores and stamps savedAt', () => {
    writeApplyEligibility(STUDENT_A);

    for (const store of [sessionStorage, localStorage]) {
      const stored = JSON.parse(store.getItem(APPLY_ELIGIBILITY_KEY)!) as ApplyEligibilityPayload;
      expect(stored.email).toBe('alex.prior@example.com');
      expect(stored.schoolSlug).toBe('concordia-hs');
      expect(Number.isFinite(Date.parse(stored.savedAt!))).toBe(true);
    }
  });
});

describe('readApplyEligibility TTL', () => {
  it('reads a fresh payload back', () => {
    writeApplyEligibility(STUDENT_A);
    expect(readApplyEligibility()?.guardianEmail).toBe('dana.guardian@example.com');
  });

  it('prefers this tab’s own sessionStorage over the shared mirror', () => {
    seedMirror({ ...STUDENT_A, email: 'stale@example.com' });
    sessionStorage.setItem(
      APPLY_ELIGIBILITY_KEY,
      JSON.stringify({ ...STUDENT_A, email: 'mine@example.com' })
    );

    expect(readApplyEligibility()?.email).toBe('mine@example.com');
  });

  it('falls back to the mirror so a new-tab resume still works', () => {
    seedMirror({ ...STUDENT_A, savedAt: new Date().toISOString() });
    expect(readApplyEligibility()?.gradeLevel).toBe('11');
  });

  it('DROPS a payload older than 7 days, from BOTH stores', () => {
    const stale = {
      ...STUDENT_A,
      savedAt: new Date(Date.now() - APPLY_ELIGIBILITY_TTL_MS - 60_000).toISOString(),
    };
    seedMirror(stale);
    sessionStorage.setItem(APPLY_ELIGIBILITY_KEY, JSON.stringify(stale));

    expect(readApplyEligibility()).toBeNull();
    // Deleted, not merely skipped: another student's guardian details must not
    // be left sitting on the machine for the next reader.
    expect(localStorage.getItem(APPLY_ELIGIBILITY_KEY)).toBeNull();
    expect(sessionStorage.getItem(APPLY_ELIGIBILITY_KEY)).toBeNull();
  });

  it('keeps a payload one minute inside the window', () => {
    seedMirror({
      ...STUDENT_A,
      savedAt: new Date(Date.now() - APPLY_ELIGIBILITY_TTL_MS + 60_000).toISOString(),
    });
    expect(readApplyEligibility()).not.toBeNull();
  });

  it('is lenient about a payload written before savedAt existed', () => {
    // Expiring these would drop a mid-funnel applicant back to "start over"
    // during the deploy window; the ownership check still covers them.
    seedMirror({ ...STUDENT_A, savedAt: undefined });
    expect(readApplyEligibility()?.email).toBe('alex.prior@example.com');
  });

  it('purges an unparseable payload', () => {
    localStorage.setItem(APPLY_ELIGIBILITY_KEY, '{ not json');
    expect(readApplyEligibility()).toBeNull();
    expect(localStorage.getItem(APPLY_ELIGIBILITY_KEY)).toBeNull();
  });
});

describe('eligibilityPayloadMatchesEmail', () => {
  it('matches case-insensitively and ignores surrounding whitespace', () => {
    expect(eligibilityPayloadMatchesEmail(STUDENT_A, '  Alex.Prior@EXAMPLE.com ')).toBe(true);
  });

  it('does not match a different address', () => {
    expect(eligibilityPayloadMatchesEmail(STUDENT_A, 'blake.next@example.com')).toBe(false);
  });

  it('does not match when either side is empty', () => {
    expect(eligibilityPayloadMatchesEmail(STUDENT_A, '')).toBe(false);
    expect(eligibilityPayloadMatchesEmail({ ...STUDENT_A, email: undefined }, 'a@b.com')).toBe(false);
    expect(eligibilityPayloadMatchesEmail(null, 'a@b.com')).toBe(false);
  });
});

describe('readApplyEligibilityForEmail — the shared-device guard', () => {
  it('returns the payload to the applicant it belongs to', () => {
    writeApplyEligibility(STUDENT_A);
    expect(readApplyEligibilityForEmail('ALEX.PRIOR@example.com ')?.guardianName).toBe(
      'Dana Guardian'
    );
  });

  it('gives student B NOTHING of student A — guardian, school or age band', () => {
    writeApplyEligibility(STUDENT_A);

    const forStudentB = readApplyEligibilityForEmail('blake.next@example.com');

    expect(forStudentB).toBeNull();
    // And it is gone, so the next reader on this machine cannot find it either.
    expect(localStorage.getItem(APPLY_ELIGIBILITY_KEY)).toBeNull();
    expect(sessionStorage.getItem(APPLY_ELIGIBILITY_KEY)).toBeNull();
  });

  it('withholds the school slug too, not only the guardian fields', () => {
    // The attribution fallback must not let a stale payload supply somebody
    // else's school either.
    writeApplyEligibility(STUDENT_A);
    expect(readApplyEligibilityForEmail('blake.next@example.com')?.schoolSlug).toBeUndefined();
  });

  it('withholds an expired payload even from its own owner', () => {
    seedMirror({
      ...STUDENT_A,
      savedAt: new Date(Date.now() - APPLY_ELIGIBILITY_TTL_MS - 1000).toISOString(),
    });
    expect(readApplyEligibilityForEmail('alex.prior@example.com')).toBeNull();
  });
});

describe('clearApplyEligibility', () => {
  it('empties both stores and is safe to call twice', () => {
    writeApplyEligibility(STUDENT_A);
    clearApplyEligibility();
    clearApplyEligibility();

    expect(readApplyEligibility()).toBeNull();
  });
});
