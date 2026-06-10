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

const APPLY_STORAGE_KEY = 'apply_eligibility';

const ELIGIBILITY_KEYS = [
  { legendKey: 'eligibilityQ1Legend', promptKey: 'eligibilityQ1Prompt' as const },
  { legendKey: 'eligibilityQ2Legend', promptKey: 'eligibilityQ2Prompt' as const },
  { legendKey: 'eligibilityQ3Legend', promptKey: 'eligibilityQ3Prompt' as const },
] as const;

const AGE_GROUPS = [
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
    // Drop drafts older than the TTL — these usually hold PII
    // (firstName / lastName / email / phone) and should not linger on
    // a shared device past a reasonable resume-application window.
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
      q3: payload.q3,
    };
    localStorage.setItem(APPLY_FLOW_DRAFT_KEY, JSON.stringify(next));
  } catch {
    /* storage full / disabled */
  }
}

export default function ApplyEligibilityClient({ variant = 'organic' }: { variant?: 'organic' | 'paid' }) {
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
  const [q3, setQ3] = useState<'yes' | 'no' | null>(null);
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
    setQ3(draft.q3 ?? null);
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

  const canContinue = contactOk && screeningDetailsOk && q1 !== null && q2 !== null && q3 !== null;
  const missingEligibilityAnswers = [q1, q2, q3].filter((answer) => answer === null).length;
  const yesCount = [q1, q2, q3].filter((answer) => answer === 'yes').length;
  const qualifies = yesCount >= 2;

  useEffect(() => {
    trackApplyFunnel(1, 'started');
    trackApplyFunnel(1, 'eligibility_view');
  }, []);

  useEffect(() => {
    answeredCountRef.current = [q1, q2, q3].filter(Boolean).length;
    trackApplyFunnel(1, 'eligibility_progress', {
      answered_count: answeredCountRef.current,
    });
  }, [q1, q2, q3]);

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
    writeDraft({ firstName, lastName, email, phone, ageGroup, city, state: stateVal, zip, county, primaryBarriers, q1, q2, q3 });
  };

  const handleSaveLater = () => {
    persistDraft();
    setSaveNotice(t('saveContinueHint'));
    trackApplyFunnel(1, 'apply_save_draft');
  };

  const handleContinue = () => {
    if (!canContinue) {
      setAttemptedContinue(true);
      trackApplyFunnel(1, 'eligibility_continue_blocked', {
        answered_count: [q1, q2, q3].filter(Boolean).length,
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
        q1,
        q2,
        q3,
        qualifies,
        yesCount,
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
      });
      sessionStorage.setItem(APPLY_STORAGE_KEY, eligibilityJson);
      // Also mirror to localStorage: sessionStorage is per-tab, so members who
      // "save and finish later" (or resume in a new tab) lose their eligibility
      // answers — the application then saves without a screening record.
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
      {/*
        Scoped visual polish for the eligibility funnel only. All selectors are
        prefixed with `.apply-flow--step1` so these rules never leak to the
        homepage/marketing foundation or to other pages that reuse
        `.form-radio-card`, `.radio-dot`, or barrier classes. Behavior is
        untouched — layout/sizing only.
      */}
      <style>{`
        /* Yes/No answer cards: tidy single-row, smaller dot aligned to label */
        .apply-flow--step1 .form-radio-cards { gap: 0.5rem; }
        .apply-flow--step1 .form-radio-card {
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 1rem;
          min-height: 44px;
        }
        .apply-flow--step1 .form-radio-card .radio-dot {
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

        /* Multi-select barrier list: small circle on the same line as the label */
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

        /* Spacing rhythm: group each question with its options, even gaps */
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
        {!isPaid ? (
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
          <fieldset className="form-group apply-eligibility-fieldset">
            <legend className="apply-eligibility-legend">{t(ELIGIBILITY_KEYS[2].legendKey)}</legend>
            <p className="apply-eligibility-prompt">{t(ELIGIBILITY_KEYS[2].promptKey)}</p>
            <div
              className="form-radio-cards"
              role="radiogroup"
              aria-invalid={attemptedContinue && q3 === null}
              aria-describedby={attemptedContinue && q3 === null ? 'apply-eligibility-q3-error' : undefined}
            >
              <label className={`form-radio-card ${q3 === 'yes' ? 'selected' : ''}`}>
                <input type="radio" name="q3" value="yes" checked={q3 === 'yes'} onChange={() => setQ3('yes')} required />
                <span className="radio-dot" />
                <span>{t('answerYes')}</span>
              </label>
              <label className={`form-radio-card ${q3 === 'no' ? 'selected' : ''}`}>
                <input type="radio" name="q3" value="no" checked={q3 === 'no'} onChange={() => setQ3('no')} required />
                <span className="radio-dot" />
                <span>{t('answerNo')}</span>
              </label>
            </div>
            {attemptedContinue && q3 === null && (
              <p id="apply-eligibility-q3-error" className="apply-eligibility-field-error" role="alert">
                {t('eligibilityRadioError')}
              </p>
            )}
          </fieldset>
        </div>
        {canContinue && (
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
              />
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
              />
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
              />
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
                onChange={(e) => setPhone(e.target.value)}
                required
                minLength={10}
                aria-invalid={attemptedContinue && phone.replace(/\D/g, '').length < 10}
                aria-describedby="apply-phone-hint"
              />
              <p id="apply-phone-hint" className="apply-field-hint">{t('eligibilityPhoneHint')}</p>
            </div>
          </div>
          {attemptedContinue && !contactOk && (
            <p className="apply-eligibility-field-error" role="alert">
              {t('contactIncompleteError')}
            </p>
          )}
        </div>

        <div className="apply-personal-block">
          <h3 className="apply-personal-block__title">{t('screeningSectionTitle')}</h3>
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
                {AGE_GROUPS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
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
          </div>
          {attemptedContinue && !screeningDetailsOk && (
            <p className="apply-eligibility-field-error" role="alert">
              {t('screeningIncompleteError')}
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
            {(!contactOk || !screeningDetailsOk) && missingEligibilityAnswers > 0
              ? `${!contactOk ? t('contactIncompleteError') : t('screeningIncompleteError')} ${t('eligibilityRadioError')}`
              : !contactOk
                ? t('contactIncompleteError')
                : !screeningDetailsOk
                  ? t('screeningIncompleteError')
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
        ) : null}
        {(!canContinue || attemptedContinue) && (
          <p id="apply-eligibility-continue-hint" className="apply-continue-hint" role={attemptedContinue ? 'status' : undefined}>
            {attemptedContinue && !canContinue
              ? t('continueBlockedHint')
              : t('continueSoftHint')}
          </p>
        )}
      </form>
    </div>
  );
}

export { APPLY_STORAGE_KEY };
