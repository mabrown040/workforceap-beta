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
  DEFAULT_PRIMARY_BARRIER,
  normalizePrimaryBarriers,
  PRIMARY_BARRIER_OPTIONS,
} from '@/lib/apply/primaryBarrierOptions';
import type { SchoolApplyContext } from '@/lib/apply/resolveSchoolApply';
import {
  SCHOOL_AGE_GROUPS,
  SCHOOL_GRADE_LEVELS,
  schoolDetailsComplete,
  schoolGuardianRequired,
  schoolPrimaryBarriers,
} from '@/lib/apply/schoolCollection';

const APPLY_STORAGE_KEY = 'apply_eligibility';

const ELIGIBILITY_KEYS = [
  { legendKey: 'eligibilityQ1Legend', promptKey: 'eligibilityQ1Prompt' as const },
  { legendKey: 'eligibilityQ2Legend', promptKey: 'eligibilityQ2Prompt' as const },
] as const;

const ADULT_AGE_GROUPS = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_24', label: '18–24' },
  { value: '25_50', label: '25–50' },
  { value: '50_plus', label: '50+' },
] as const;

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
      gradeLevel: payload.gradeLevel,
      parentGuardianName: payload.parentGuardianName,
      parentGuardianEmail: payload.parentGuardianEmail,
      parentGuardianPhone: payload.parentGuardianPhone,
      schoolName: payload.schoolName,
    };
    localStorage.setItem(APPLY_FLOW_DRAFT_KEY, JSON.stringify(next));
  } catch {
    /* storage full / disabled */
  }
}

export default function ApplyEligibilityClient({
  variant = 'organic',
  schoolApply = null,
}: {
  variant?: 'organic' | 'paid';
  schoolApply?: SchoolApplyContext | null;
}) {
  const isPaid = variant === 'paid';
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
  const [gradeLevel, setGradeLevel] = useState('');
  const [parentGuardianName, setParentGuardianName] = useState('');
  const [parentGuardianEmail, setParentGuardianEmail] = useState('');
  const [parentGuardianPhone, setParentGuardianPhone] = useState('');
  const [q2, setQ2] = useState<'yes' | 'no' | null>(null);
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
    setGradeLevel(draft.gradeLevel ?? '');
    setParentGuardianName(draft.parentGuardianName ?? '');
    setParentGuardianEmail(draft.parentGuardianEmail ?? '');
    setParentGuardianPhone(draft.parentGuardianPhone ?? '');
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
  const isSchool = Boolean(schoolApply);
  const guardianRequired = isSchool && schoolGuardianRequired(ageGroup);
  const screeningDetailsOk = isSchool
    ? schoolDetailsComplete(
        {
          ageGroup: ageGroup ?? '',
          gradeLevel,
          city,
          state: stateVal,
          zipOk,
          parentGuardianName,
          parentGuardianEmail,
        },
        emailLooksValid,
      )
    : !!ageGroup &&
      city.trim().length > 0 &&
      stateVal.trim().length > 0 &&
      zipOk &&
      county.trim().length > 0 &&
      primaryBarriers.length > 0;
  const canContinue =
    contactOk &&
    screeningDetailsOk &&
    (isSchool || (q1 !== null && q2 !== null));
  const ageOptions = isSchool ? SCHOOL_AGE_GROUPS : ADULT_AGE_GROUPS;
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

  const persistDraft = () => {
    writeDraft({
      firstName, lastName, email, phone, ageGroup, city, state: stateVal, zip,
      county: isSchool ? '' : county,
      primaryBarriers: isSchool ? schoolPrimaryBarriers() : primaryBarriers,
      q1: isSchool ? null : q1,
      q2: isSchool ? null : q2,
      gradeLevel, parentGuardianName, parentGuardianEmail, parentGuardianPhone,
      schoolName: schoolApply?.schoolName,
    });
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
      writeDraft({
        firstName, lastName, email, phone, ageGroup, city, state: stateVal, zip,
        county: isSchool ? '' : county,
        primaryBarriers: isSchool ? schoolPrimaryBarriers() : primaryBarriers,
        q1: isSchool ? null : q1,
        q2: isSchool ? null : q2,
        gradeLevel, parentGuardianName, parentGuardianEmail, parentGuardianPhone,
        schoolName: schoolApply?.schoolName,
      });
      setAutoSaved(true);
    }, 1500);
    return () => clearTimeout(handle);
  }, [firstName, lastName, email, phone, ageGroup, city, stateVal, zip, county, primaryBarriers, q1, q2, gradeLevel, parentGuardianName, parentGuardianEmail, parentGuardianPhone, schoolApply?.schoolName]);

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
    trackApplyFunnel(2, 'qualification_completed', { qualifies, yes_count: yesCount });
    trackApplyFunnel(1, 'eligibility_complete', { qualifies, yes_count: yesCount });
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(APPLY_FLOW_DRAFT_KEY);
      } catch {
        /* ignore */
      }
      const eligibilityJson = JSON.stringify({
        q1: isSchool ? null : q1,
        q2: isSchool ? null : q2,
        qualifies: isSchool ? true : qualifies,
        yesCount: isSchool ? 0 : yesCount,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.replace(/\D/g, ''),
        ageGroup,
        city: city.trim(),
        state: stateVal.trim(),
        zip: zip.trim(),
        county: county.trim(),
        primaryBarriers: isSchool ? schoolPrimaryBarriers() : primaryBarriers,
        gradeLevel: gradeLevel.trim() || undefined,
        parentGuardianName: parentGuardianName.trim() || undefined,
        parentGuardianEmail: parentGuardianEmail.trim() || undefined,
        parentGuardianPhone: parentGuardianPhone.replace(/\D/g, '') || undefined,
        schoolName: schoolApply?.schoolName,
        schoolApply: Boolean(schoolApply),
      });
      sessionStorage.setItem(APPLY_STORAGE_KEY, eligibilityJson);
      try {
        localStorage.setItem(APPLY_STORAGE_KEY, eligibilityJson);
      } catch {
        /* storage full / disabled */
      }
    }
    const resultsPath = programParam ? `/apply/results?program=${encodeURIComponent(programParam)}` : '/apply/results';
    router.push(localizeHref(resultsPath, locale));
  };

  return (
    <div className={`apply-flow apply-flow--step1${isPaid ? ' apply-flow--paid' : ''}`} data-variant={isPaid ? 'paid' : 'organic'}>
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
          <p className="apply-progress-label">{t(isSchool ? 'schoolStep1ProgressLabel' : 'step1ProgressLabel')}</p>
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
        {!isPaid && isSchool ? (
          <>
            <p className="apply-social-proof" role="note">
              {t('schoolApplySocialProof', { school: schoolApply?.partnerName ?? 'your school' })}
            </p>
            <p className="apply-step-kicker">{t('step1Kicker')}</p>
            <h2 className="apply-step-title">{t('schoolStep1Title')}</h2>
            <p className="apply-step-desc">{t('schoolStep1Lead')}</p>
            <div className="apply-transition-card" role="note" data-collection="school">
              <strong>{t('schoolBannerStrong', { school: schoolApply?.partnerName ?? 'your school' })}</strong>
              <span> {t('schoolBannerBody')}</span>
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

        {!isSchool ? (
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
        ) : null}
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
          <h3 className="apply-personal-block__title">{t(isSchool ? 'schoolScreeningTitle' : 'screeningSectionTitle')}</h3>
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
              >
                <option value="">{t('ageGroupPlaceholder')}</option>
                {ageOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            {isSchool ? (
              <div className="form-group apply-form-group--full">
                <label htmlFor="apply-grade-level">{t('schoolGradeLabel')}</label>
                <select
                  id="apply-grade-level"
                  name="gradeLevel"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  required
                  aria-invalid={attemptedContinue && !gradeLevel}
                >
                  <option value="">{t('schoolGradePlaceholder')}</option>
                  {SCHOOL_GRADE_LEVELS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            ) : null}
            {guardianRequired ? (
              <>
                <div className="form-group apply-form-group--full">
                  <label htmlFor="apply-guardian-name">{t('schoolGuardianName')}</label>
                  <input
                    id="apply-guardian-name"
                    type="text"
                    name="parentGuardianName"
                    autoComplete="name"
                    value={parentGuardianName}
                    onChange={(e) => setParentGuardianName(e.target.value)}
                    required
                    aria-invalid={attemptedContinue && !parentGuardianName.trim()}
                  />
                </div>
                <div className="form-group apply-form-group--full">
                  <label htmlFor="apply-guardian-email">{t('schoolGuardianEmail')}</label>
                  <input
                    id="apply-guardian-email"
                    type="email"
                    name="parentGuardianEmail"
                    autoComplete="email"
                    value={parentGuardianEmail}
                    onChange={(e) => setParentGuardianEmail(e.target.value)}
                    required
                    aria-invalid={attemptedContinue && !emailLooksValid(parentGuardianEmail.trim())}
                  />
                </div>
                <div className="form-group apply-form-group--full">
                  <label htmlFor="apply-guardian-phone">{t('schoolGuardianPhone')}</label>
                  <input
                    id="apply-guardian-phone"
                    type="tel"
                    name="parentGuardianPhone"
                    autoComplete="tel"
                    value={parentGuardianPhone}
                    onChange={(e) => setParentGuardianPhone(formatPhoneInput(e.target.value))}
                  />
                </div>
              </>
            ) : null}
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
            {!isSchool ? (
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
            ) : null}
            {!isSchool ? (
              <div className="form-group apply-form-group--full">
                <label>{t('primaryBarriersLabel')}</label>
                <div className="apply-barrier-options" role="group" aria-label={t('primaryBarriersAria')}>
                  {PRIMARY_BARRIER_OPTIONS.map((option) => (
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
            ) : null}
          </div>
          {attemptedContinue && !screeningDetailsOk && (
            <p className="apply-eligibility-field-error" role="alert">
              {t(isSchool ? 'schoolScreeningIncompleteError' : 'screeningIncompleteError')}
            </p>
          )}
        </div>

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
            {!isSchool && (!contactOk || !screeningDetailsOk) && missingEligibilityAnswers > 0
              ? `${!contactOk ? t('contactIncompleteError') : t('screeningIncompleteError')} ${t('eligibilityRadioError')}`
              : !contactOk
                ? t('contactIncompleteError')
                : !screeningDetailsOk
                  ? t(isSchool ? 'schoolScreeningIncompleteError' : 'screeningIncompleteError')
                : t('eligibilityRadioError')}
          </p>
        ) : null}
        <p className="apply-consent-line" style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.75rem 0 0', lineHeight: 1.5 }}>
          {t('applyConsentLine')}{' '}
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
              ? t(isSchool ? 'schoolContinueBlocked' : 'continueBlockedHint')
              : t(isSchool ? 'schoolContinueSoft' : 'continueSoftHint')}
          </p>
        )}
      </form>
    </div>
  );
}

export { APPLY_STORAGE_KEY };
