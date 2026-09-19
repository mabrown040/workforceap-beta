import { describe, it, expect } from 'vitest';
import {
  APPLICANT_TRIAGE_BUCKET_RANK,
  APPLICANT_TRIAGE_BUCKET_TEXT,
  APPLICANT_TRIAGE_CHECKLIST_TEXT,
  APPLICANT_TRIAGE_REASON_TEXT,
  localizeApplicantTriage,
  triageApplicant,
  type ApplicantTriageInput,
} from '@/lib/admin/applicantTriage';
import type { WioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';

// ── fixtures ─────────────────────────────────────────────────────────────────

function wioaSnap(overrides: Partial<WioaQualificationSnapshot['answers']> = {}, signal: WioaQualificationSnapshot['signal'] = 'likely'): WioaQualificationSnapshot {
  return {
    version: 1,
    submittedAt: '2026-09-01T12:00:00.000Z',
    signal,
    reasons: [],
    answers: {
      ageBracket: '25_54',
      countyOrZip: '30301',
      primaryBarrier: 'none',
      dislocatedWorker: false,
      lowIncomeSelfReport: true,
      trainingInterest: true,
      completedIntakeSelfReport: false,
      publicAssistanceSelfReport: null,
      ...overrides,
    },
  };
}

/** A complete, unambiguous applicant: every checklist item except partner/WIOA-verified is satisfied. */
function readyInput(overrides: Partial<ApplicantTriageInput> = {}): ApplicantTriageInput {
  return {
    application: { status: 'PENDING', programInterest: 'it-support', referralPartnerId: null, referralSource: null },
    user: {
      fullName: 'Test Applicant',
      email: 'applicant@example.test',
      phone: '4045550100',
      programInterest: 'it-support',
      wioaReviewStatus: null,
    },
    profile: { profilePhone: null, authorizedToWork: null, usCitizen: null, isMinor: false },
    applyScreening: { q1: 'yes', q2: 'no', q3: 'yes', receivingUnemployment: 'no', snapWic: 'no', partnerAmbassadorReferral: null },
    wioaSnapshot: null,
    programRecognized: true,
    hasPartnerReferral: false,
    ...overrides,
  };
}

const check = (input: ApplicantTriageInput, key: string) =>
  triageApplicant(input).checklist.find((c) => c.key === key)?.ok;

// ── buckets ──────────────────────────────────────────────────────────────────

describe('triageApplicant — ready_to_review', () => {
  it('buckets a complete, unambiguous applicant as ready with an intake-complete reason', () => {
    const r = triageApplicant(readyInput());
    expect(r.bucket).toBe('ready_to_review');
    expect(r.reasonCodes).toEqual(['intake_complete']);
    expect(check(readyInput(), 'contact')).toBe(true);
    expect(check(readyInput(), 'program')).toBe(true);
    expect(check(readyInput(), 'intake_screening')).toBe(true);
    expect(check(readyInput(), 'work_authorization')).toBe(true);
    expect(check(readyInput(), 'funding_fit_signal')).toBe(true);
  });

  it('accepts a phone stored only on the profile', () => {
    const r = triageApplicant(readyInput({
      user: { ...readyInput().user, phone: null },
      profile: { profilePhone: '4045550101', authorizedToWork: null, usCitizen: null, isMinor: false },
    }));
    expect(r.bucket).toBe('ready_to_review');
  });

  it('is ready on the portal WIOA self-screening alone (no apply screen), when the signal is likely/possible', () => {
    const r = triageApplicant(readyInput({
      applyScreening: null,
      profile: { authorizedToWork: true, isMinor: false },
      wioaSnapshot: wioaSnap({}, 'possible'),
    }));
    expect(r.bucket).toBe('ready_to_review');
  });

  it('treats a program the caller did not check (null) as not blocking', () => {
    expect(triageApplicant(readyInput({ programRecognized: null })).bucket).toBe('ready_to_review');
  });
});

describe('triageApplicant — not_eligible_signal (concern flagged)', () => {
  it('flags an explicit "no" to work authorization on the apply screen', () => {
    const r = triageApplicant(readyInput({ applyScreening: { q1: 'yes', q2: 'yes', q3: 'no' } }));
    expect(r.bucket).toBe('not_eligible_signal');
    expect(r.reasonCodes).toContain('work_auth_answered_no');
    expect(check(readyInput({ applyScreening: { q1: 'yes', q2: 'yes', q3: 'no' } }), 'work_authorization')).toBe(false);
  });

  it('flags profile.authorizedToWork === false', () => {
    const r = triageApplicant(readyInput({
      applyScreening: { q1: 'yes', q2: 'no', q3: null },
      profile: { authorizedToWork: false, isMinor: false },
    }));
    expect(r.bucket).toBe('not_eligible_signal');
  });

  it('flags a staff WIOA review already marked not_eligible', () => {
    const r = triageApplicant(readyInput({ user: { ...readyInput().user, wioaReviewStatus: 'not_eligible' } }));
    expect(r.bucket).toBe('not_eligible_signal');
    expect(r.reasonCodes).toEqual(['staff_marked_not_eligible']);
  });

  it('concern outranks missing info and ambiguity', () => {
    const r = triageApplicant(readyInput({
      application: { status: 'NEEDS_INFO', programInterest: null },
      user: { ...readyInput().user, programInterest: null, phone: null },
      applyScreening: { q1: 'no', q2: 'no', q3: 'no' },
    }));
    expect(r.bucket).toBe('not_eligible_signal');
    // still explains everything else that is wrong
    expect(r.reasonCodes).toEqual(expect.arrayContaining(['work_auth_answered_no', 'staff_requested_info', 'contact_incomplete', 'program_missing']));
  });
});

describe('triageApplicant — missing_info', () => {
  it('follows an existing NEEDS_INFO application status', () => {
    const r = triageApplicant(readyInput({ application: { status: 'NEEDS_INFO', programInterest: 'it-support' } }));
    expect(r.bucket).toBe('missing_info');
    expect(r.reasonCodes).toEqual(['staff_requested_info']);
  });

  it('follows a staff WIOA review of needs_info', () => {
    const r = triageApplicant(readyInput({ user: { ...readyInput().user, wioaReviewStatus: 'needs_info' } }));
    expect(r.bucket).toBe('missing_info');
    expect(r.reasonCodes).toContain('staff_wioa_needs_info');
  });

  it('needs a phone number', () => {
    const r = triageApplicant(readyInput({ user: { ...readyInput().user, phone: '  ' }, profile: null }));
    expect(r.bucket).toBe('missing_info');
    expect(r.reasonCodes).toEqual(['contact_incomplete']);
  });

  it('needs a program choice (application or user)', () => {
    const r = triageApplicant(readyInput({
      application: { status: 'PENDING', programInterest: '' },
      user: { ...readyInput().user, programInterest: null },
    }));
    expect(r.bucket).toBe('missing_info');
    expect(r.reasonCodes).toEqual(['program_missing']);
    expect(check(readyInput({ application: { status: 'PENDING', programInterest: '' }, user: { ...readyInput().user, programInterest: null } }), 'program')).toBe(false);
  });

  it('falls back to the user program interest when the application has none', () => {
    const r = triageApplicant(readyInput({ application: { status: 'PENDING', programInterest: null } }));
    expect(r.bucket).toBe('ready_to_review');
  });

  it('needs some intake screening (apply screen or WIOA self-screening)', () => {
    const r = triageApplicant(readyInput({ applyScreening: null, wioaSnapshot: null }));
    expect(r.bucket).toBe('missing_info');
    expect(r.reasonCodes).toEqual(['intake_screening_missing']);
    // no work-auth complaint when there is no screening at all — one ask, not two
    expect(r.reasonCodes).not.toContain('work_auth_unanswered');
  });

  it('asks for work authorization when screening exists but never answered it', () => {
    const r = triageApplicant(readyInput({ applyScreening: { q1: 'yes', q2: 'no', q3: null }, profile: null }));
    expect(r.bucket).toBe('missing_info');
    expect(r.reasonCodes).toEqual(['work_auth_unanswered']);
  });
});

describe('triageApplicant — needs_human', () => {
  it('sends the "only work authorization was yes" case to a human (apply screen qualifies, but no funding-fit signal)', () => {
    const r = triageApplicant(readyInput({ applyScreening: { q1: 'no', q2: 'no', q3: 'yes' } }));
    expect(r.bucket).toBe('needs_human');
    expect(r.reasonCodes).toEqual(['funding_fit_not_indicated']);
    expect(check(readyInput({ applyScreening: { q1: 'no', q2: 'no', q3: 'yes' } }), 'funding_fit_signal')).toBe(false);
  });

  it('counts unemployment benefits or SNAP/WIC as a funding-fit signal', () => {
    expect(triageApplicant(readyInput({ applyScreening: { q1: 'no', q2: 'no', q3: 'yes', receivingUnemployment: 'yes' } })).bucket).toBe('ready_to_review');
    expect(triageApplicant(readyInput({ applyScreening: { q1: 'no', q2: 'no', q3: 'yes', snapWic: 'yes' } })).bucket).toBe('ready_to_review');
  });

  it('flags conflicting work-authorization answers instead of guessing', () => {
    const r = triageApplicant(readyInput({ profile: { authorizedToWork: false, isMinor: false } }));
    expect(r.bucket).toBe('needs_human');
    expect(r.reasonCodes).toEqual(['work_auth_conflict']);
    expect(check(readyInput({ profile: { authorizedToWork: false, isMinor: false } }), 'work_authorization')).toBe(false);
  });

  it('flags a chosen program that is not in the catalog', () => {
    const r = triageApplicant(readyInput({ programRecognized: false }));
    expect(r.bucket).toBe('needs_human');
    expect(r.reasonCodes).toEqual(['program_unrecognized']);
  });

  it('flags an unclear / review WIOA self-screening signal even when other answers indicate a fit', () => {
    const r = triageApplicant(readyInput({ wioaSnapshot: wioaSnap({}, 'unclear') }));
    expect(r.bucket).toBe('needs_human');
    expect(r.reasonCodes).toEqual(['wioa_signal_unclear']);
  });

  it('routes minors (profile flag or WIOA age bracket) to a human', () => {
    expect(triageApplicant(readyInput({ profile: { isMinor: true } })).reasonCodes).toContain('minor_applicant');
    const r = triageApplicant(readyInput({ wioaSnapshot: wioaSnap({ ageBracket: 'under18' }) }));
    expect(r.bucket).toBe('needs_human');
    expect(r.reasonCodes).toContain('minor_applicant');
  });

  it('notes a staff WIOA review still in progress', () => {
    for (const status of ['pending', 'in_review']) {
      const r = triageApplicant(readyInput({ user: { ...readyInput().user, wioaReviewStatus: status } }));
      expect(r.bucket).toBe('needs_human');
      expect(r.reasonCodes).toEqual(['wioa_review_in_progress']);
    }
  });

  it('missing info outranks ambiguity', () => {
    const r = triageApplicant(readyInput({ programRecognized: false, user: { ...readyInput().user, phone: null }, profile: null }));
    expect(r.bucket).toBe('missing_info');
    expect(r.reasonCodes).toEqual(expect.arrayContaining(['contact_incomplete', 'program_unrecognized']));
  });
});

// ── checklist extras ─────────────────────────────────────────────────────────

describe('triageApplicant — checklist', () => {
  it('always returns the seven items in a fixed order with labels', () => {
    const keys = triageApplicant(readyInput()).checklist.map((c) => c.key);
    expect(keys).toEqual(['contact', 'program', 'intake_screening', 'work_authorization', 'funding_fit_signal', 'partner_referral', 'wioa_staff_review']);
    for (const item of triageApplicant(readyInput()).checklist) {
      expect(item.label).toBe(APPLICANT_TRIAGE_CHECKLIST_TEXT[item.key]);
    }
  });

  it('ticks partner referral from the application, a referral row, or the apply-screen ambassador field', () => {
    expect(check(readyInput(), 'partner_referral')).toBe(false);
    expect(check(readyInput({ application: { status: 'PENDING', programInterest: 'it-support', referralPartnerId: 'p1' } }), 'partner_referral')).toBe(true);
    expect(check(readyInput({ hasPartnerReferral: true }), 'partner_referral')).toBe(true);
    expect(check(readyInput({ applyScreening: { q1: 'yes', q2: 'no', q3: 'yes', partnerAmbassadorReferral: 'Ambassador A' } }), 'partner_referral')).toBe(true);
  });

  it('ticks staff WIOA review only when verified, and verified does not change the bucket', () => {
    expect(check(readyInput(), 'wioa_staff_review')).toBe(false);
    const verified = readyInput({ user: { ...readyInput().user, wioaReviewStatus: 'verified' } });
    expect(check(verified, 'wioa_staff_review')).toBe(true);
    expect(triageApplicant(verified).bucket).toBe('ready_to_review');
  });

  it('never approves or declares eligibility in its copy', () => {
    const copy = [
      ...Object.values(APPLICANT_TRIAGE_BUCKET_TEXT),
      ...Object.values(APPLICANT_TRIAGE_CHECKLIST_TEXT),
      APPLICANT_TRIAGE_REASON_TEXT.intake_complete,
      APPLICANT_TRIAGE_REASON_TEXT.funding_fit_not_indicated,
    ].join(' \n ');
    expect(copy).not.toMatch(/approved|\beligible\b(?!\s*\()/i);
    expect(APPLICANT_TRIAGE_BUCKET_TEXT.ready_to_review).toBe('Ready to review');
    expect(APPLICANT_TRIAGE_REASON_TEXT.intake_complete).toMatch(/^Intake complete/);
  });
});

// ── localisation + ordering ──────────────────────────────────────────────────

describe('localizeApplicantTriage', () => {
  it('resolves bucket, reasons and checklist through the translator', () => {
    const t = (key: string) => `T:${key}`;
    const d = localizeApplicantTriage(triageApplicant(readyInput()), t);
    expect(d.label).toBe('T:applicantTriage.bucket.ready_to_review');
    expect(d.reasons).toEqual(['T:applicantTriage.reason.intake_complete']);
    expect(d.checklist[0]).toMatchObject({ key: 'contact', ok: true, label: 'T:applicantTriage.checklist.contact' });
  });

  it('falls back to English when the translator echoes the key, returns a namespaced key, or throws', () => {
    const echo = localizeApplicantTriage(triageApplicant(readyInput()), (k) => k);
    expect(echo.label).toBe('Ready to review');
    const namespaced = localizeApplicantTriage(triageApplicant(readyInput()), (k) => `admin.${k}`);
    expect(namespaced.reasons).toEqual([APPLICANT_TRIAGE_REASON_TEXT.intake_complete]);
    const throwing = localizeApplicantTriage(triageApplicant(readyInput()), () => { throw new Error('missing'); });
    expect(throwing.checklist[0].label).toBe(APPLICANT_TRIAGE_CHECKLIST_TEXT.contact);
  });
});

describe('APPLICANT_TRIAGE_BUCKET_RANK', () => {
  it('orders ready first, then missing info, then judgement calls, then concerns', () => {
    const order = Object.entries(APPLICANT_TRIAGE_BUCKET_RANK).sort((a, b) => a[1] - b[1]).map(([k]) => k);
    expect(order).toEqual(['ready_to_review', 'missing_info', 'needs_human', 'not_eligible_signal']);
  });
});
