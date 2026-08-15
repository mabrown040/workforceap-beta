'use client';

import { useEffect, useRef, useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { localizeHref, useLocaleFromPath } from '@/lib/i18n/client';
import { trackApplyFunnel } from '@/lib/analytics/events';
import { isValidPostalCode } from '@/lib/validation/postalCode';
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';
import { APPLY_FLOW_DRAFT_KEY, type ApplyFlowDraftV1 } from '@/lib/apply/applyProgramStorage';
import {
  clearApplyEligibility,
  writeApplyEligibility,
} from '@/lib/apply/applyEligibilityStorage';
import { APPLY_REFERRAL_SESSION_KEY } from '@/lib/apply/applyReferralCapture';
import {
  DEFAULT_PRIMARY_BARRIER,
  normalizePrimaryBarriers,
  PRIMARY_BARRIER_OPTIONS,
  SCHOOL_PRIMARY_BARRIER_OPTIONS,
} from '@/lib/apply/primaryBarrierOptions';

/** Server route that clears the httpOnly partner-ref cookie (see its docblock). */
const NOT_MY_SCHOOL_PATH = '/api/apply/not-my-school';

const ELIGIBILITY_KEYS = [
  { legendKey: 'eligibilityQ1Legend', promptKey: 'eligibilityQ1Prompt' as const },
  { legendKey: 'eligibilityQ2Legend', promptKey: 'eligibilityQ2Prompt' as const },
] as const;

/**
 * `under_18` is deliberately first (Phase A). In the school variant that is
 * the answer most applicants need, so it stays at the top of the list rather
 * than buried under three adult bands.
 *
 * Labels go through `t()`. They were hard-coded English, which left the
 * translated hint below naming an option ("Menor de 18") that did not exist in
 * the select — on the one field that decides whether the applicant is treated
 * as a minor.
 */
const AGE_GROUPS = [
  { value: 'under_18', labelKey: 'ageGroupUnder18' },
  { value: '18_24', labelKey: 'ageGroup18To24' },
  { value: '25_50', labelKey: 'ageGroup25To50' },
  { value: '50_plus', labelKey: 'ageGroup50Plus' },
] as const;

/**
 * Grade options mirror the select in `components/forms/ParentalConsentForm.tsx`
 * so a student who answers here and again on the consent form is offered the
 * same choices. That form's `ged` / `graduate` options are omitted: this
 * variant is only reachable from a high school's own enrollment link, where
 * "currently enrolled, grades 9–12" is the population by construction.
 */
const SCHOOL_GRADE_OPTIONS = [
  { value: '9', labelKey: 'schoolGrade9' },
  { value: '10', labelKey: 'schoolGrade10' },
  { value: '11', labelKey: 'schoolGrade11' },
  { value: '12', labelKey: 'schoolGrade12' },
] as const;

/**
 * There is deliberately no expected-graduation-year question.
 *
 * It had no column, no reader (it reached free text in `Application.notes` and
 * stopped there), and is derivable from `gradeLevel` plus the school's own
 * records. The version that shipped also offered the CURRENT year first, which
 * is wrong for everyone applying after May, and computed its option list
 * during render — a hydration mismatch waiting for a year boundary. Removed
 * rather than patched: the cheapest correct version of a field nobody reads is
 * no field.
 */

/** The three partner columns the school variant renders. No ids, no internals. */
export type SchoolPartnerSummary = {
  name: string;
  slug: string;
  schoolDistrict: string | null;
};

const APPLY_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function readDraft(): ApplyFlowDraftV1 | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(APPLY_FLOW_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApplyFlowDraftV1;
    if (parsed?.version !== 1) return null;
    if (typeof parsed.updatedAt === 'string') {
      const updated = Date.parse(parsed.updatedAt);
      if (Number.isFinite(updated) && Date.now() - updated > APPLY_DRAFT_TTL_MS) {
        try { localStorage.removeItem(APPLY_FLOW_DRAFT_KEY); } catch { /* noop */ }
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(payload: Omit<ApplyFlowDraftV1, 'version' | 'updatedAt'> & { version?: 1 }) {
  if (typeof window === 'undefined') return;
  try {
    const next: ApplyFlowDraftV1 = {
      version: 1,
      updatedAt: new Date().toISOString(),
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      ageGroup: payload.ageGroup,
      city: payload.city,
      state: payload.state,
      zip: payload.zip,
      county: payload.county,
      primaryBarriers: payload.primaryBarriers,
      q1: payload.q1,
      q2: payload.q2,
      // School variant (Phase B4). These are `undefined` for organic/paid,
      // and `JSON.stringify` drops undefined keys — so the serialized draft
      // for those variants is byte-identical to what it was before B4.
      //
      // `schoolAttestation` is NOT here, and must never be: an affirmation
      // has to be made in the session that submits it. Persisting it meant a
      // draft could re-tick "I am currently enrolled at <school>" for the
      // NEXT student on a shared machine, who then submitted a statement they
      // never made.
      gradeLevel: payload.gradeLevel,
      studentId: payload.studentId,
      guardianName: payload.guardianName,
      guardianEmail: payload.guardianEmail,
      guardianPhone: payload.guardianPhone,
    };
    localStorage.setItem(APPLY_FLOW_DRAFT_KEY, JSON.stringify(next));
  } catch {
    /* storage full / disabled */
  }
}

export default function ApplyEligibilityClient({
  variant = 'organic',
  schoolPartner,
  sponsorshipInForce = false,
}: {
  variant?: 'organic' | 'paid' | 'school';
  schoolPartner?: SchoolPartnerSummary | null;
  /**
   * Whether the school's sponsorship is in force right now. Defaults to
   * FALSE — the neutral copy — so a caller that forgets to pass it can only
   * ever under-claim. See `SchoolApplyVariant`.
   */
  sponsorshipInForce?: boolean;
}) {
  const isPaid = variant === 'paid';
  /**
   * Every school-only branch below is gated on this. It requires the partner
   * object as well as the variant string: without a resolved partner there is
   * no school to attest enrollment at, and rendering "I am enrolled at ___"
   * is worse than falling back to the standard wizard. `app/apply/page.tsx`
   * only ever passes the two together.
   */
  const isSchool = variant === 'school' && !!schoolPartner;
  const schoolName = schoolPartner?.name?.trim() ?? '';
  const schoolDistrict = schoolPartner?.schoolDistrict?.trim() ?? '';
  const t = useTranslations('apply');
  const tForm = useTranslations('form');
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocaleFromPath();
  const programParam = searchParams?.get('program');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const formatPhoneInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };
  const [phoneError, setPhoneError] = useState('');
  const [ageGroup, setAgeGroup] = useState<ApplyFlowDraftV1['ageGroup']>('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [zip, setZip] = useState('');
  const [county, setCounty] = useState('');
  const [primaryBarriers, setPrimaryBarriers] = useState<string[]>([DEFAULT_PRIMARY_BARRIER.value]);
  const toggleBarrier = (v: string) =>
    setPrimaryBarriers((cur) =>
      normalizePrimaryBarriers(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v])
    );

  const [q1, setQ1] = useState<'yes' | 'no' | null>(null);
  const [q2, setQ2] = useState<'yes' | 'no' | null>(null);

  // ── School variant state (Phase B4) ──
  // Declared unconditionally (hooks rules); only read/rendered when isSchool.
  const [gradeLevel, setGradeLevel] = useState('');
  const [schoolAttestation, setSchoolAttestation] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  const [attemptedContinue, setAttemptedContinue] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const completedRef = useRef(false);
  const answeredCountRef = useRef(0);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const draft = readDraft();
    if (!draft) return;
    setFirstName(draft.firstName ?? '');
    setLastName(draft.lastName ?? '');
    setEmail(draft.email ?? '');
    setPhone(draft.phone ?? '');
    setAgeGroup(draft.ageGroup ?? '');
    setCity(draft.city ?? '');
    setStateVal(draft.state ?? '');
    setZip(draft.zip ?? '');
    setCounty(draft.county ?? '');
    setPrimaryBarriers(normalizePrimaryBarriers(draft.primaryBarriers));
    setQ1(draft.q1 ?? null);
    setQ2(draft.q2 ?? null);
    // Optional on the draft type, so a pre-B4 draft restores exactly as before.
    setGradeLevel(draft.gradeLevel ?? '');
    // `schoolAttestation` is deliberately NOT restored. An affirmation must be
    // made in the session that submits it — a restored tick is a statement the
    // person at the keyboard never made, and on a shared school machine it may
    // not even be true of them.
    setStudentId(draft.studentId ?? '');
    setGuardianName(draft.guardianName ?? '');
    setGuardianEmail(draft.guardianEmail ?? '');
    setGuardianPhone(draft.guardianPhone ?? '');
  }, []);

  const emailLooksValid = (value: string) => {
    const v = value.trim();
    if (!v.includes('@')) return false;
    const [local, domain] = v.split('@');
    if (!local || !domain || !domain.includes('.')) return false;
    const tld = domain.split('.').pop() ?? '';
    return tld.length >= 2;
  };

  const phoneDigits = phone.replace(/\D/g, '');
  const contactOk =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    emailLooksValid(email.trim()) &&
    phone.trim().length > 0 &&
    phoneDigits.length >= 10;

  const zipOk = isValidPostalCode(zip);
  const screeningDetailsOk =
    !!ageGroup &&
    city.trim().length > 0 &&
    stateVal.trim().length > 0 &&
    zipOk &&
    county.trim().length > 0 &&
    primaryBarriers.length > 0;

  // ── School variant gating (Phase B4) ──
  // Each of these is unconditionally `true` outside the school variant, so
  // `canContinue` below is arithmetically identical to what it was for
  // organic and paid traffic.
  const schoolAnswersOk = !isSchool || (gradeLevel !== '' && schoolAttestation);

  /**
   * The barriers checklist a school applicant sees.
   *
   * B4 removed the two INCOME questions as inappropriate for a minor but kept
   * a checklist asking the same minor to disclose SNAP/TANF receipt, justice
   * involvement, disability and housing instability — materially more
   * sensitive, and it lands in `Profile.barrierTypes`, in
   * `Application.notes` (which the member's own GDPR export returns verbatim),
   * and in the admin alert email. Reduced rather than removed so the block
   * keeps doing its job: `hasEmploymentBarrier` / `barrierTypes` stay
   * populated, the supportive-services signal ("other barrier") survives, and
   * step 1 keeps the same shape for every variant. A counselor collects the
   * rest in person, with a guardian present, where it belongs.
   */
  const barrierOptions = isSchool ? SCHOOL_PRIMARY_BARRIER_OPTIONS : PRIMARY_BARRIER_OPTIONS;

  /** A minor on a partner-sponsored seat needs a reachable adult on file. */
  const guardianRequired = isSchool && ageGroup === 'under_18';
  const guardianEmailTrimmed = guardianEmail.trim();
  /**
   * The failure this exists to stop: a student entering their OWN address so
   * the "parent" notifications land in their own inbox. Compared
   * case-insensitively on trimmed values because `Student@X.com ` and
   * `student@x.com` are the same mailbox.
   */
  const guardianEmailIsApplicantEmail =
    guardianEmailTrimmed.length > 0 &&
    guardianEmailTrimmed.toLowerCase() === email.trim().toLowerCase();
  const guardianEmailOk =
    emailLooksValid(guardianEmailTrimmed) && !guardianEmailIsApplicantEmail;
  const guardianPhoneDigits = guardianPhone.replace(/\D/g, '');
  const guardianOk =
    !guardianRequired ||
    (guardianName.trim().length > 0 && guardianEmailOk && guardianPhoneDigits.length >= 10);

  /**
   * The two workforce-funding questions are not rendered in the school
   * variant (they ask minors about their own employment status and household
   * income, and the seat is partner-funded either way), so they cannot gate
   * the button there.
   */
  const eligibilityAnswersOk = isSchool || (q1 !== null && q2 !== null);

  const canContinue =
    contactOk && screeningDetailsOk && eligibilityAnswersOk && schoolAnswersOk && guardianOk;
  const missingEligibilityAnswers = [q1, q2].filter((answer) => answer === null).length;
  const yesCount = [q1, q2].filter((answer) => answer === 'yes').length;
  const qualifies = yesCount >= 1;

  useEffect(() => {
    trackApplyFunnel(1, 'started');
    trackApplyFunnel(1, 'eligibility_view');
  }, []);

  useEffect(() => {
    answeredCountRef.current = [q1, q2].filter(Boolean).length;
    trackApplyFunnel(1, 'eligibility_progress', {
      answered_count: answeredCountRef.current,
    });
  }, [q1, q2]);

  useEffect(() => {
    return () => {
      if (!completedRef.current) {
        trackApplyFunnel(1, 'eligibility_dropoff', {
          answered_count: answeredCountRef.current,
        });
      }
    };
  }, []);

  /**
   * School answers ride the draft only in the school variant, so the stored
   * JSON for organic/paid keeps exactly the keys it had before Phase B4.
   */
  const schoolDraftFields = isSchool
    ? { gradeLevel, studentId, guardianName, guardianEmail, guardianPhone }
    : {};

  const persistDraft = () => {
    writeDraft({ firstName, lastName, email, phone, ageGroup, city, state: stateVal, zip, county, primaryBarriers, q1, q2, ...schoolDraftFields });
  };

  /**
   * "This isn't my school" (see `app/api/apply/not-my-school/route.ts`).
   *
   * The 30-day partner-ref cookie survives an abandoned application, so on a
   * shared lab machine the NEXT student can land on a bare `/apply`, see a
   * read-only school they do not attend, and find a REQUIRED attestation
   * saying they are enrolled there with no way past it. This is the way out.
   *
   * Clears everything the browser owns first — the session referral key, the
   * school answers in the step-1 draft, and any `apply_eligibility` payload —
   * then navigates to the route handler, which is the only thing that can
   * clear the httpOnly cookie. Their typed contact details survive in the
   * draft, so the standard wizard comes back pre-filled rather than blank.
   */
  const notMySchoolHref = programParam
    ? `${NOT_MY_SCHOOL_PATH}?program=${encodeURIComponent(programParam)}`
    : NOT_MY_SCHOOL_PATH;
  const handleNotMySchool = () => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(APPLY_REFERRAL_SESSION_KEY);
    } catch {
      /* ignore */
    }
    clearApplyEligibility();
    // Re-write the draft with every school/guardian key absent, so a switched
    // student's guardian details do not sit in localStorage for the next one.
    writeDraft({
      firstName,
      lastName,
      email,
      phone,
      ageGroup,
      city,
      state: stateVal,
      zip,
      county,
      primaryBarriers,
      q1,
      q2,
    });
    // The navigation itself is the anchor's own — this handler only clears the
    // browser-side state, synchronously, before the browser follows the link.
  };

  const [autoSaved, setAutoSaved] = useState(false);
  const autosaveSkippedInitial = useRef(false);
  useEffect(() => {
    if (!autosaveSkippedInitial.current) {
      autosaveSkippedInitial.current = true;
      return;
    }
    if (!firstName && !lastName && !email && !phone) return;
    const handle = setTimeout(() => {
      writeDraft({ firstName, lastName, email, phone, ageGroup, city, state: stateVal, zip, county, primaryBarriers, q1, q2, ...schoolDraftFields });
      setAutoSaved(true);
    }, 1500);
    return () => clearTimeout(handle);
    // The school fields are constant ('' / false) outside the school variant,
    // so adding them here cannot change when organic/paid traffic autosaves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, email, phone, ageGroup, city, stateVal, zip, county, primaryBarriers, q1, q2, gradeLevel, studentId, guardianName, guardianEmail, guardianPhone]);

  const handleSaveLater = () => {
    persistDraft();
    setSaveNotice(t('saveContinueHint'));
    trackApplyFunnel(1, 'apply_save_draft');
  };

  const handleContinue = () => {
    if (!canContinue) {
      setAttemptedContinue(true);
      trackApplyFunnel(1, 'eligibility_continue_blocked', {
        answered_count: [q1, q2].filter(Boolean).length,
      });
      requestAnimationFrame(() => {
        const invalid = document.querySelector<HTMLElement>(
          'form [aria-invalid="true"], form input:invalid, form select:invalid',
        );
        const target = invalid?.matches('input, select, textarea, button')
          ? invalid
          : invalid?.querySelector<HTMLElement>('input, select, textarea');
        (target ?? document.getElementById('apply-eligibility-continue-hint'))?.focus();
      });
      return;
    }

    completedRef.current = true;
    // School applicants answered no funding questions, so `qualifies`/
    // `yes_count` are structurally 0 for them. The extra `variant` key lets
    // analytics exclude them from the WIOA-fit rate instead of reading every
    // school seat as a failed screen. Organic/paid payloads are unchanged.
    const funnelQualification = isSchool
      ? { qualifies, yes_count: yesCount, variant: 'school' }
      : { qualifies, yes_count: yesCount };
    trackApplyFunnel(2, 'qualification_completed', funnelQualification);
    trackApplyFunnel(1, 'eligibility_complete', funnelQualification);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(APPLY_FLOW_DRAFT_KEY);
      } catch {
        /* ignore */
      }
      // `writeApplyEligibility` stamps `savedAt` and mirrors to localStorage
      // under a 7-day TTL, so an abandoned payload cannot sit on a shared
      // school machine indefinitely waiting for the next student.
      writeApplyEligibility({
        // Omitted entirely in the school variant: the questions were never
        // asked, so posting `qualifies: false, yesCount: 0` would write a
        // "Quick eligibility fit: review (0/3)" line into the application
        // notes of a student who was never screened.
        ...(isSchool ? {} : { q1: q1 ?? undefined, q2: q2 ?? undefined, qualifies, yesCount }),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.replace(/\D/g, ''),
        ageGroup,
        city: city.trim(),
        state: stateVal.trim(),
        zip: zip.trim(),
        county: county.trim(),
        primaryBarriers,
        ...(isSchool
          ? {
              variant: 'school' as const,
              // Read back at step 3 as the referralRef fallback, so a new-tab
              // resume still attributes the application to the school.
              schoolSlug: schoolPartner?.slug,
              gradeLevel,
              // Carried to step 3 because a reviewer needs to know the student
              // affirmed enrollment. Safe here and not in the DRAFT: this is
              // written at the instant of submit, by the session that made the
              // affirmation, and the payload is gated at step 3 on the stored
              // email matching the person then typing.
              schoolAttestation,
              studentId: studentId.trim() || undefined,
              // Guardian details are only meaningful for a minor; an
              // applicant who switches their age band back to 18+ after
              // typing them must not have them posted.
              ...(guardianRequired
                ? {
                    guardianName: guardianName.trim(),
                    guardianEmail: guardianEmailTrimmed.toLowerCase(),
                    guardianPhone: guardianPhone.replace(/\D/g, ''),
                  }
                : {}),
            }
          : {}),
      });
    }
    const resultsPath = programParam ? `/apply/results?program=${encodeURIComponent(programParam)}` : '/apply/results';
    router.push(localizeHref(resultsPath, locale));
  };

  return (
    <div
      className={`apply-flow apply-flow--step1${isPaid ? ' apply-flow--paid' : ''}${isSchool ? ' apply-flow--school' : ''}`}
      data-variant={isPaid ? 'paid' : isSchool ? 'school' : 'organic'}
    >
      <style>{`
        .apply-flow--step1 .form-radio-cards { gap: 0.5rem; }
        .apply-flow--step1 .form-radio-card {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 1rem;
          min-height: 44px;
        }
        .apply-flow--step1 .form-radio-card .radio-dot {
          display: inline-block;
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          border-width: 2px;
          margin-top: 0;
        }
        .apply-flow--step1 .form-radio-card.selected .radio-dot {
          box-shadow: inset 0 0 0 3px var(--color-white);
        }
        html.dark .apply-flow--step1 .form-radio-card.selected .radio-dot {
          box-shadow: inset 0 0 0 3px var(--surface-container-high);
        }
        .apply-flow--step1 .apply-barrier-options { gap: 0.125rem; }
        .apply-flow--step1 .apply-barrier-option {
          align-items: center;
          gap: 0.625rem;
          padding: 0.4rem 0.5rem;
        }
        .apply-flow--step1 .apply-barrier-option input {
          width: 16px;
          height: 16px;
          margin-top: 0;
        }
        .apply-flow--step1 .apply-barrier-option__label { line-height: 1.3; }
        .apply-flow--step1 .funding-questions {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .apply-flow--step1 .funding-questions .form-group { margin-bottom: 0; }
        .apply-flow--step1 .apply-eligibility-legend { margin-bottom: 0.25rem; }
        .apply-flow--step1 .apply-eligibility-prompt { margin-bottom: 0.625rem; }
        .apply-flow--step1 .apply-personal-block { margin-bottom: 1.25rem; }
        .apply-flow--step1 .apply-personal-block__title { margin-bottom: 0.75rem; }
        .apply-flow--school .apply-readonly-field input {
          background: var(--surface-container);
          color: var(--color-on-surface-variant);
          cursor: default;
        }
        .apply-flow--school .apply-school-attestation {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          line-height: 1.35;
        }
        .apply-flow--school .apply-school-attestation input {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          margin-top: 0.15rem;
        }
        .apply-flow--school .apply-not-my-school {
          color: var(--color-accent);
          font-weight: 600;
          text-decoration: underline;
        }
        @media (max-width: 768px) {
          .apply-flow--step1 .form-radio-card { align-items: center; }
          .apply-flow--step1 .apply-barrier-option { align-items: center; }
          .apply-flow--step1 .apply-step-title {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
          }
          .apply-flow--step1 .apply-step-desc:not(.apply-eligibility-exception-note) {
            display: none;
          }
          .apply-flow--step1 .apply-eligibility-exception-note {
            margin-top: 0;
            margin-bottom: 1rem;
            font-size: 0.875rem;
            line-height: 1.45;
          }
        }
      `}</style>
      {!isPaid ? (
        <div className="apply-progress-bar" aria-label={t('progressAriaLabel')}>
          <div className="apply-progress-fill" style={{ width: '33%' }} />
          <p className="apply-progress-label">{t('step1ProgressLabel')}</p>
        </div>
      ) : null}

      <form
        className="apply-step-content"
        action={localizeHref(programParam ? `/apply/results?program=${encodeURIComponent(programParam)}` : '/apply/results', locale)}
        method="get"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
      >
        {isSchool ? (
          /* The organic header sells "estimate funding fit" and explains the
             income/employment questions — copy that does not apply to a
             partner-sponsored school seat and that no student was asked. */
          <>
            <h2 className="apply-step-title">{t('schoolStep1Title')}</h2>
            {/* Only the sponsored wording claims the seat is paid for. A
                school outside its funding window, or one at its seat cap,
                gets the neutral lead — the same rule `/enroll/<slug>` was
                hardened to in Phase B3. */}
            <p className="apply-step-desc">
              {sponsorshipInForce
                ? t('schoolStep1Lead', { schoolName })
                : t('schoolStep1LeadNeutral', { schoolName })}
            </p>
            <div className="apply-transition-card" role="note" aria-label={t('transitionCardAriaWhatNext')}>
              <strong>{t('step1WhatNextStrong')}</strong>
              <span> {t('step1WhatNextBody')}</span>
            </div>
          </>
        ) : !isPaid ? (
          <>
            <p className="apply-social-proof" role="note">
              {t('applySocialProof')}
            </p>
            <p className="apply-step-kicker">{t('step1Kicker')}</p>
            <h2 className="apply-step-title">{t('step1Title')}</h2>
            <p className="apply-step-desc">{t('step1Lead')}</p>
            <p className="apply-step-desc apply-eligibility-exception-note">
              {t('eligibilityExceptionLead')}{' '}
              <LocalizedLink href="/faq" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                FAQ
              </LocalizedLink>
              {t('eligibilityExceptionSuffix')}
            </p>

            <div className="apply-transition-card" role="note" aria-label={t('transitionCardAriaWhatNext')}>
              <strong>{t('step1WhatNextStrong')}</strong>
              <span> {t('step1WhatNextBody')}</span>
            </div>
          </>
        ) : (
          <>
            <h2 className="apply-step-title">{t('step1Title')}</h2>
            <p className="apply-step-desc">{t('paidStep1Lead')}</p>
          </>
        )}

        {isSchool ? (
          /* SCHOOL VARIANT: the adult funding screener (Q1 employment status,
             Q2 household income under $60k) is not rendered at all. Both are
             inappropriate to ask a minor and irrelevant to a seat the school
             is paying for — see the WIOA-n/a marker written server-side. */
          <div className="funding-questions">
            <div className="form-group">
              <label htmlFor="apply-grade-level">{t('schoolGradeLabel')}</label>
              <select
                id="apply-grade-level"
                name="gradeLevel"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                required
                aria-invalid={attemptedContinue && !gradeLevel}
                aria-describedby={attemptedContinue && !gradeLevel ? 'apply-grade-level-error' : undefined}
              >
                <option value="">{t('schoolGradePlaceholder')}</option>
                {SCHOOL_GRADE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                ))}
              </select>
              {attemptedContinue && !gradeLevel && (
                <p id="apply-grade-level-error" className="apply-eligibility-field-error" role="alert">
                  {t('errSchoolGrade')}
                </p>
              )}
            </div>
            <div className="form-group">
              <label className="apply-school-attestation" htmlFor="apply-school-attestation">
                <input
                  id="apply-school-attestation"
                  type="checkbox"
                  name="schoolAttestation"
                  checked={schoolAttestation}
                  onChange={(e) => setSchoolAttestation(e.target.checked)}
                  required
                  aria-required="true"
                  aria-invalid={attemptedContinue && !schoolAttestation}
                  aria-describedby={
                    attemptedContinue && !schoolAttestation ? 'apply-school-attestation-error' : undefined
                  }
                />
                {/* Enrollment ONLY. The version that shipped also asked the
                    student to attest that "my school is sponsoring my
                    participation" — a funding arrangement between two
                    organisations that no student can know, and which is not
                    even true when the sponsorship has lapsed. */}
                <span>{t('schoolAttestationLabel', { schoolName })} *</span>
              </label>
              {attemptedContinue && !schoolAttestation && (
                <p id="apply-school-attestation-error" className="apply-eligibility-field-error" role="alert">
                  {t('errSchoolAttestation')}
                </p>
              )}
            </div>
          </div>
        ) : (
        <div className="funding-questions">
          <fieldset className="form-group apply-eligibility-fieldset">
            <legend className="apply-eligibility-legend">{t(ELIGIBILITY_KEYS[0].legendKey)}</legend>
            <p className="apply-eligibility-prompt">{t(ELIGIBILITY_KEYS[0].promptKey)}</p>
            <div
              className="form-radio-cards"
              role="radiogroup"
              aria-invalid={attemptedContinue && q1 === null}
              aria-describedby={attemptedContinue && q1 === null ? 'apply-eligibility-q1-error' : undefined}
            >
              <label className={`form-radio-card ${q1 === 'yes' ? 'selected' : ''}`}>
                <input type="radio" name="q1" value="yes" checked={q1 === 'yes'} onChange={() => setQ1('yes')} required />
                <span className="radio-dot" />
                <span>{t('answerYes')}</span>
              </label>
              <label className={`form-radio-card ${q1 === 'no' ? 'selected' : ''}`}>
                <input type="radio" name="q1" value="no" checked={q1 === 'no'} onChange={() => setQ1('no')} required />
                <span className="radio-dot" />
                <span>{t('answerNo')}</span>
              </label>
            </div>
            {attemptedContinue && q1 === null && (
              <p id="apply-eligibility-q1-error" className="apply-eligibility-field-error" role="alert">
                {t('eligibilityRadioError')}
              </p>
            )}
          </fieldset>
          <fieldset className="form-group apply-eligibility-fieldset">
            <legend className="apply-eligibility-legend">{t(ELIGIBILITY_KEYS[1].legendKey)}</legend>
            <p className="apply-eligibility-prompt">{t(ELIGIBILITY_KEYS[1].promptKey)}</p>
            <div
              className="form-radio-cards"
              role="radiogroup"
              aria-invalid={attemptedContinue && q2 === null}
              aria-describedby={attemptedContinue && q2 === null ? 'apply-eligibility-q2-error' : undefined}
            >
              <label className={`form-radio-card ${q2 === 'yes' ? 'selected' : ''}`}>
                <input type="radio" name="q2" value="yes" checked={q2 === 'yes'} onChange={() => setQ2('yes')} required />
                <span className="radio-dot" />
                <span>{t('answerYes')}</span>
              </label>
              <label className={`form-radio-card ${q2 === 'no' ? 'selected' : ''}`}>
                <input type="radio" name="q2" value="no" checked={q2 === 'no'} onChange={() => setQ2('no')} required />
                <span className="radio-dot" />
                <span>{t('answerNo')}</span>
              </label>
            </div>
            {attemptedContinue && q2 === null && (
              <p id="apply-eligibility-q2-error" className="apply-eligibility-field-error" role="alert">
                {t('eligibilityRadioError')}
              </p>
            )}
          </fieldset>
        </div>
        )}
        {/* Funding-fit banner reports on the two questions above; the school
            variant never asks them, so it never speaks to funding fit. */}
        {!isSchool && canContinue && (
          <div className={`funding-banner ${qualifies ? 'funding-banner-qualify' : 'funding-banner-neutral'}`}>
            {qualifies ? (
              <p>
                <strong>{t('fundingBannerQualifyStrong')}</strong> {t('fundingBannerQualifyRest')}
              </p>
            ) : (
              <p>
                <strong>{t('fundingBannerNeutralStrong')}</strong> {t('fundingBannerNeutralRest')}
              </p>
            )}
          </div>
        )}
        <div className="apply-personal-block">
          <h3 className="apply-personal-block__title">{t('personalSectionTitle')}</h3>
          <div className="apply-personal-grid">
            <div className="form-group apply-form-group--full">
              <label htmlFor="apply-first-name">{tForm('firstNameRequired')}</label>
              <input
                id="apply-first-name"
                type="text"
                name="firstName"
                autoComplete="given-name"
                inputMode="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                aria-invalid={attemptedContinue && !firstName.trim()}
                aria-describedby={attemptedContinue && !firstName.trim() ? 'apply-first-name-error' : undefined}
              />
              {attemptedContinue && !firstName.trim() && (
                <p id="apply-first-name-error" className="apply-eligibility-field-error" role="alert">
                  {t('errFirstName')}
                </p>
              )}
            </div>
            <div className="form-group apply-form-group--full">
              <label htmlFor="apply-last-name">{tForm('lastNameRequired')}</label>
              <input
                id="apply-last-name"
                type="text"
                name="lastName"
                autoComplete="family-name"
                inputMode="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                aria-invalid={attemptedContinue && !lastName.trim()}
                aria-describedby={attemptedContinue && !lastName.trim() ? 'apply-last-name-error' : undefined}
              />
              {attemptedContinue && !lastName.trim() && (
                <p id="apply-last-name-error" className="apply-eligibility-field-error" role="alert">
                  {t('errLastName')}
                </p>
              )}
            </div>
            <div className="form-group apply-form-group--full">
              <label htmlFor="apply-email">{tForm('emailRequired')}</label>
              <input
                id="apply-email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={attemptedContinue && !emailLooksValid(email.trim())}
                aria-describedby={attemptedContinue && !emailLooksValid(email.trim()) ? 'apply-email-error' : undefined}
              />
              {attemptedContinue && !emailLooksValid(email.trim()) && (
                <p id="apply-email-error" className="apply-eligibility-field-error" role="alert">
                  {email.trim().length === 0 ? t('errEmailRequired') : t('errEmailInvalid')}
                </p>
              )}
            </div>
            <div className="form-group apply-form-group--full">
              <label htmlFor="apply-phone">{tForm('phoneNumber')} *</label>
              <input
                id="apply-phone"
                type="tel"
                name="phone"
                autoComplete="tel"
                inputMode="tel"
                placeholder="(512) 555-0100"
                value={phone}
                onChange={(e) => {
                  const formatted = formatPhoneInput(e.target.value);
                  setPhone(formatted);
                  if (phoneError) {
                    const digits = formatted.replace(/\D/g, '');
                    if (digits.length >= 10) setPhoneError('');
                  }
                }}
                onBlur={() => {
                  const digits = phone.replace(/\D/g, '');
                  if (digits.length > 0 && digits.length < 10) {
                    setPhoneError(t('phoneValidationError'));
                  } else {
                    setPhoneError('');
                  }
                }}
                required
                minLength={10}
                aria-invalid={attemptedContinue && phone.replace(/\D/g, '').length < 10}
                aria-describedby="apply-phone-hint apply-phone-error"
              />
              <p id="apply-phone-hint" className="apply-field-hint">{t('eligibilityPhoneHint')}</p>
              {phoneError && (
                <p id="apply-phone-error" className="apply-eligibility-field-error" role="alert">
                  {phoneError}
                </p>
              )}
            </div>
          </div>
          {attemptedContinue && !contactOk && (
            <p className="apply-eligibility-field-error" role="alert">
              {t('contactIncompleteError')}
            </p>
          )}
        </div>

        <div className="apply-personal-block">
          <h3 className="apply-personal-block__title">
            {isSchool ? t('schoolScreeningSectionTitle') : t('screeningSectionTitle')}
          </h3>
          <div className="apply-personal-grid">
            <div className="form-group apply-form-group--full">
              <label htmlFor="apply-age-group">{t('ageGroupLabel')}</label>
              <select
                id="apply-age-group"
                name="ageGroup"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as ApplyFlowDraftV1['ageGroup'])}
                required
                aria-invalid={attemptedContinue && !ageGroup}
                aria-describedby={isSchool ? 'apply-age-group-hint' : undefined}
              >
                <option value="">{t('ageGroupPlaceholder')}</option>
                {AGE_GROUPS.map((option) => (
                  <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                ))}
              </select>
              {isSchool && (
                /* Neutral by design. The hint used to read "Most students
                   applying through <school> choose 'Under 18'", which nudges
                   the answer on the one field that decides whether the
                   applicant is handled as a minor. */
                <p id="apply-age-group-hint" className="apply-field-hint">
                  {t('schoolAgeGroupHint')}
                </p>
              )}
            </div>
            <div className="form-group apply-form-group--full">
              <label htmlFor="apply-city">{tForm('city')} *</label>
              <input
                id="apply-city"
                type="text"
                name="city"
                autoComplete="address-level2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                aria-invalid={attemptedContinue && !city.trim()}
              />
            </div>
            <div className="form-group apply-form-group--full">
              <label htmlFor="apply-state">{tForm('state')} *</label>
              <input
                id="apply-state"
                type="text"
                name="state"
                autoComplete="address-level1"
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                required
                maxLength={50}
                aria-invalid={attemptedContinue && !stateVal.trim()}
              />
            </div>
            <div className="form-group apply-form-group--full">
              <label htmlFor="apply-zip">{tForm('zip')} *</label>
              <input
                id="apply-zip"
                type="text"
                name="zip"
                autoComplete="postal-code"
                inputMode="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                required
                aria-invalid={attemptedContinue && !zipOk}
              />
            </div>
            <div className="form-group apply-form-group--full">
              <label htmlFor="apply-county">{t('countyLabel')}</label>
              <input
                id="apply-county"
                type="text"
                name="county"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                required
                aria-invalid={attemptedContinue && !county.trim()}
              />
            </div>
            <div className="form-group apply-form-group--full">
              <label>{t('primaryBarriersLabel')}</label>
              <div className="apply-barrier-options" role="group" aria-label={t('primaryBarriersAria')}>
                {barrierOptions.map((option) => (
                  <label key={option.value} className="apply-barrier-option">
                    <input
                      type="checkbox"
                      name="primaryBarriers"
                      value={option.value}
                      checked={primaryBarriers.includes(option.value)}
                      onChange={() => toggleBarrier(option.value)}
                    />
                    <span className="apply-barrier-option__label">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {attemptedContinue && !screeningDetailsOk && (
            <p className="apply-eligibility-field-error" role="alert">
              {t('screeningIncompleteError')}
            </p>
          )}
        </div>

        {isSchool && (
          <div className="apply-personal-block">
            <h3 className="apply-personal-block__title">{t('schoolSectionTitle')}</h3>
            <div className="apply-personal-grid">
              {/* School and district are read-only: they come from the partner
                  row behind the enrollment link, and the server re-derives
                  them from that row rather than trusting anything posted. */}
              <div className="form-group apply-form-group--full apply-readonly-field">
                <label htmlFor="apply-school-name">{t('schoolNameLabel')}</label>
                <input
                  id="apply-school-name"
                  type="text"
                  name="schoolName"
                  value={schoolName}
                  readOnly
                  aria-readonly="true"
                  aria-describedby="apply-school-name-hint"
                />
                <p id="apply-school-name-hint" className="apply-field-hint">
                  {t('schoolPrefilledHint')}{' '}
                  {/* The partner-ref cookie lasts 30 days and is consumed only
                      by a successful signup, so on a shared school machine the
                      NEXT student can arrive here looking at a school they do
                      not attend — with an attestation they cannot truthfully
                      tick and cannot skip. This is the way out. */}
                  {/* A real anchor, not a button: it IS a navigation, and the
                      cookie can only be cleared by the server response at the
                      other end. The click handler clears the browser-side
                      state synchronously first. */}
                  <a
                    className="apply-not-my-school"
                    href={notMySchoolHref}
                    onClick={handleNotMySchool}
                  >
                    {t('schoolNotMineCta')}
                  </a>
                </p>
              </div>
              {/* Hidden entirely when the partner has no district on file —
                  an empty read-only box is noise a student cannot act on. */}
              {schoolDistrict ? (
                <div className="form-group apply-form-group--full apply-readonly-field">
                  <label htmlFor="apply-school-district">{t('schoolDistrictLabel')}</label>
                  <input
                    id="apply-school-district"
                    type="text"
                    name="schoolDistrict"
                    value={schoolDistrict}
                    readOnly
                    aria-readonly="true"
                  />
                </div>
              ) : null}
              <div className="form-group apply-form-group--full">
                <label htmlFor="apply-student-id">{t('schoolStudentIdLabel')}</label>
                <input
                  id="apply-student-id"
                  type="text"
                  name="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  maxLength={64}
                  aria-describedby="apply-student-id-hint"
                />
                <p id="apply-student-id-hint" className="apply-field-hint">
                  {t('schoolStudentIdHint')}
                </p>
              </div>
            </div>
          </div>
        )}

        {guardianRequired && (
          <div className="apply-personal-block">
            <h3 className="apply-personal-block__title">{t('guardianSectionTitle')}</h3>
            <p className="apply-step-desc">{t('guardianIntro')}</p>
            <div className="apply-personal-grid">
              <div className="form-group apply-form-group--full">
                <label htmlFor="apply-guardian-name">{t('guardianNameLabel')}</label>
                <input
                  id="apply-guardian-name"
                  type="text"
                  name="guardianName"
                  autoComplete="off"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  required
                  maxLength={200}
                  aria-invalid={attemptedContinue && !guardianName.trim()}
                  aria-describedby={attemptedContinue && !guardianName.trim() ? 'apply-guardian-name-error' : undefined}
                />
                {attemptedContinue && !guardianName.trim() && (
                  <p id="apply-guardian-name-error" className="apply-eligibility-field-error" role="alert">
                    {t('errGuardianName')}
                  </p>
                )}
              </div>
              <div className="form-group apply-form-group--full">
                <label htmlFor="apply-guardian-email">{t('guardianEmailLabel')}</label>
                <input
                  id="apply-guardian-email"
                  type="email"
                  name="guardianEmail"
                  autoComplete="off"
                  inputMode="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  required
                  maxLength={200}
                  aria-invalid={
                    guardianEmailIsApplicantEmail || (attemptedContinue && !guardianEmailOk)
                  }
                  aria-describedby={
                    guardianEmailIsApplicantEmail || (attemptedContinue && !guardianEmailOk)
                      ? 'apply-guardian-email-error'
                      : undefined
                  }
                />
                {/* The same-as-student error shows as soon as it is true, not
                    only after a blocked submit: it is the mistake this field
                    exists to catch, and the fix is obvious once named. */}
                {(guardianEmailIsApplicantEmail || (attemptedContinue && !guardianEmailOk)) && (
                  <p id="apply-guardian-email-error" className="apply-eligibility-field-error" role="alert">
                    {guardianEmailIsApplicantEmail
                      ? t('errGuardianEmailSameAsApplicant')
                      : guardianEmailTrimmed.length === 0
                        ? t('errGuardianEmailRequired')
                        : t('errGuardianEmailInvalid')}
                  </p>
                )}
              </div>
              <div className="form-group apply-form-group--full">
                <label htmlFor="apply-guardian-phone">{t('guardianPhoneLabel')}</label>
                <input
                  id="apply-guardian-phone"
                  type="tel"
                  name="guardianPhone"
                  autoComplete="off"
                  inputMode="tel"
                  placeholder="(512) 555-0100"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(formatPhoneInput(e.target.value))}
                  required
                  minLength={10}
                  aria-invalid={attemptedContinue && guardianPhoneDigits.length < 10}
                  aria-describedby={
                    attemptedContinue && guardianPhoneDigits.length < 10 ? 'apply-guardian-phone-error' : undefined
                  }
                />
                {attemptedContinue && guardianPhoneDigits.length < 10 && (
                  <p id="apply-guardian-phone-error" className="apply-eligibility-field-error" role="alert">
                    {t('errGuardianPhone')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="apply-step1-actions">
          <button
            type="submit"
            className={marketingButtonPresets.formSubmitPrimary('apply-step1-actions__primary')}
            aria-describedby={attemptedContinue && !canContinue ? 'apply-eligibility-summary-error apply-eligibility-continue-hint' : 'apply-eligibility-continue-hint'}
          >
            {t('continueToPrograms')}
          </button>
          {!isPaid ? (
            <button type="button" className={marketingButtonPresets.formOutlineSecondary('apply-step1-actions__secondary')} onClick={handleSaveLater}>
              {t('saveContinueLater')}
            </button>
          ) : null}
        </div>
        {attemptedContinue && !canContinue ? (
          <p id="apply-eligibility-summary-error" className="apply-eligibility-field-error" role="alert">
            {isSchool
              ? !contactOk
                ? t('contactIncompleteError')
                : !screeningDetailsOk
                  ? t('screeningIncompleteError')
                  : !schoolAnswersOk
                    ? t('errSchoolSectionIncomplete')
                    : t('errGuardianSectionIncomplete')
              : (!contactOk || !screeningDetailsOk) && missingEligibilityAnswers > 0
                ? `${!contactOk ? t('contactIncompleteError') : t('screeningIncompleteError')} ${t('eligibilityRadioError')}`
                : !contactOk
                  ? t('contactIncompleteError')
                  : !screeningDetailsOk
                    ? t('screeningIncompleteError')
                  : t('eligibilityRadioError')}
          </p>
        ) : null}
        {/* A self-identified minor cannot accept terms on their own behalf, so
            the line attributes acceptance to the guardian whose details they
            just gave us. */}
        <p className="apply-consent-line" style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.75rem 0 0', lineHeight: 1.5 }}>
          {guardianRequired ? t('applyConsentLineGuardian') : t('applyConsentLine')}{' '}
          <LocalizedLink href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>
            {t('applyConsentPrivacy')}
          </LocalizedLink>{' '}
          {t('applyConsentAnd')}{' '}
          <LocalizedLink href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>
            {t('applyConsentTerms')}
          </LocalizedLink>
          .
        </p>
        {saveNotice ? (
          <p className="apply-save-notice" role="status" aria-live="polite">
            {saveNotice}
          </p>
        ) : autoSaved ? (
          <p className="apply-save-notice" role="status" aria-live="polite">
            {t('autoSavedNotice')}
          </p>
        ) : null}
        {(!canContinue || attemptedContinue) && (
          <p id="apply-eligibility-continue-hint" className="apply-continue-hint" tabIndex={-1} role={attemptedContinue ? 'status' : undefined}>
            {attemptedContinue && !canContinue
              ? isSchool
                // "all three questions" is the adult screener's wording.
                ? t('schoolContinueBlockedHint')
                : t('continueBlockedHint')
              : t('continueSoftHint')}
          </p>
        )}
      </form>
    </div>
  );
}
