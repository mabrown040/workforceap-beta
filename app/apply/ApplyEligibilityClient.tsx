'use client';

import { useEffect, useRef, useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { localizeHref, useLocaleFromPath } from '@/lib/i18n/client';
import { trackApplyFunnel, trackFunnelEvent } from '@/lib/analytics/events';
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';
import { APPLY_FLOW_DRAFT_KEY, type ApplyFlowDraftV1 } from '@/lib/apply/applyProgramStorage';
import { UTM_SESSION_KEYS } from '@/lib/marketing/utmCapture';

const APPLY_STORAGE_KEY = 'apply_eligibility';

const ELIGIBILITY_KEYS = [
  { legendKey: 'eligibilityQ1Legend', promptKey: 'eligibilityQ1Prompt' as const },
  { legendKey: 'eligibilityQ2Legend', promptKey: 'eligibilityQ2Prompt' as const },
  { legendKey: 'eligibilityQ3Legend', promptKey: 'eligibilityQ3Prompt' as const },
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
      q1: payload.q1,
      q2: payload.q2,
      q3: payload.q3,
    };
    localStorage.setItem(APPLY_FLOW_DRAFT_KEY, JSON.stringify(next));
  } catch {
    /* storage full / disabled */
  }
}

export default function ApplyEligibilityClient() {
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

  const [q1, setQ1] = useState<'yes' | 'no' | null>(null);
  const [q2, setQ2] = useState<'yes' | 'no' | null>(null);
  const [q3, setQ3] = useState<'yes' | 'no' | null>(null);
  const [attemptedContinue, setAttemptedContinue] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  // Paid-traffic variant: rendered when a `wa_utm_source` was captured
  // earlier in the session by `lib/marketing/utmCapture.ts` (which is
  // hydrated by `<UtmCapture />` on the parent server page). Organic /
  // direct visitors get the existing form unchanged.
  const [paidUtmSource, setPaidUtmSource] = useState<string | null>(null);
  const completedRef = useRef(false);
  const answeredCountRef = useRef(0);
  const hydratedRef = useRef(false);
  const paidVariantFiredRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const draft = readDraft();
    if (!draft) return;
    setFirstName(draft.firstName ?? '');
    setLastName(draft.lastName ?? '');
    setEmail(draft.email ?? '');
    setPhone(draft.phone ?? '');
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

  const canContinue = contactOk && q1 !== null && q2 !== null && q3 !== null;
  const missingEligibilityAnswers = [q1, q2, q3].filter((answer) => answer === null).length;
  const yesCount = [q1, q2, q3].filter((answer) => answer === 'yes').length;
  const qualifies = yesCount >= 2;

  useEffect(() => {
    trackApplyFunnel(1, 'started');
    trackApplyFunnel(1, 'eligibility_view');
  }, []);

  // Detect a paid-traffic visitor by reading the UTM source previously
  // stashed in sessionStorage. Runs once on mount (client only). If a
  // non-empty source is present we flip into the paid variant render
  // path and fire the variant-rendered funnel event exactly once.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let source: string | null = null;
    try {
      const raw = sessionStorage.getItem(UTM_SESSION_KEYS.source);
      source = raw && raw.trim().length > 0 ? raw.trim() : null;
    } catch {
      source = null;
    }
    if (source) {
      setPaidUtmSource(source);
      if (!paidVariantFiredRef.current) {
        paidVariantFiredRef.current = true;
        trackFunnelEvent('apply_paid_variant', 'rendered', { utm_source: source });
      }
    }
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
    writeDraft({ firstName, lastName, email, phone, q1, q2, q3 });
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
      sessionStorage.setItem(
        APPLY_STORAGE_KEY,
        JSON.stringify({
          q1,
          q2,
          q3,
          qualifies,
          yesCount,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.replace(/\D/g, ''),
        })
      );
    }
    const resultsPath = programParam ? `/apply/results?program=${encodeURIComponent(programParam)}` : '/apply/results';
    router.push(localizeHref(resultsPath, locale));
  };

  const isPaid = paidUtmSource !== null;

  return (
    <div className={`apply-flow apply-flow--step1${isPaid ? ' apply-flow--paid' : ''}`} data-variant={isPaid ? 'paid' : 'organic'}>
      <div className="apply-progress-bar" aria-label={t('progressAriaLabel')}>
        <div className="apply-progress-fill" style={{ width: '33%' }} />
        <p className="apply-progress-label">{t('step1ProgressLabel')}</p>
      </div>

      {isPaid ? (
        <div
          className="apply-paid-hero"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            padding: 'var(--space-5) var(--space-5)',
            marginBottom: 'var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)',
            color: 'var(--color-white)',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: 0,
              color: 'var(--color-white)',
            }}
          >
            Apply in 5 minutes &mdash; no cost
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--font-size-base)',
              lineHeight: 'var(--line-height-normal)',
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            Fill in your contact info and three quick eligibility questions. We&rsquo;ll route you to a funded
            training program with placement support.
          </p>
          <a
            href="#apply-first-name"
            className={marketingButtonPresets.heroPrimary('apply-paid-hero__cta')}
            style={{
              alignSelf: 'center',
              background: 'var(--color-white)',
              color: 'var(--color-accent)',
              borderColor: 'var(--color-white)',
              marginTop: 'var(--space-2)',
            }}
          >
            Start now &mdash; it&rsquo;s free
          </a>
        </div>
      ) : null}

      {isPaid ? (
        <div
          className="apply-paid-social-proof"
          role="note"
          aria-label="Member outcomes"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-container)',
            border: '1px solid var(--outline-variant)',
            color: 'var(--color-on-surface-variant)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>Members hired at:</span>
          {/* TODO(growth): swap placeholder logos for the real ones once the
              G3 employer logo strip lands. For now we render plain text
              tokens that still convey the "name-brand employers" signal. */}
          <span style={{ fontWeight: 700 }}>Google</span>
          <span aria-hidden="true">&middot;</span>
          <span style={{ fontWeight: 700 }}>IBM</span>
          <span aria-hidden="true">&middot;</span>
          <span style={{ fontWeight: 700 }}>AWS</span>
        </div>
      ) : null}

      {isPaid ? (
        <div
          className="apply-paid-salary-strip"
          role="note"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-5)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)',
            color: 'var(--color-on-surface)',
            fontSize: 'var(--font-size-sm)',
            textAlign: 'center',
          }}
        >
          {/* TODO(growth): replace placeholder outcome numbers with real
              90-day placement metrics once `lib/admin/outcomes.ts` exposes
              a stable public-facing aggregate. */}
          <strong>Avg starting salary $58K</strong> &middot; 90-day placement support
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
        <p className="apply-social-proof" role="note">
          {t('applySocialProof')}
        </p>
        <p className="apply-step-kicker">{t('step1Kicker')}</p>
        <h2 className="apply-step-title">{t('step1Title')}</h2>
        <p className="apply-step-desc">{t('step1Lead')}</p>
        {!isPaid ? (
          <p className="apply-step-desc apply-eligibility-exception-note">
            {t('eligibilityExceptionLead')}{' '}
            <LocalizedLink href="/faq" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              FAQ
            </LocalizedLink>
            {t('eligibilityExceptionSuffix')}
          </p>
        ) : null}

        <div className="apply-transition-card" role="note" aria-label={t('transitionCardAriaWhatNext')}>
          <strong>{t('step1WhatNextStrong')}</strong>
          <span> {t('step1WhatNextBody')}</span>
        </div>

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
            {!contactOk && missingEligibilityAnswers > 0
              ? `${t('contactIncompleteError')} ${t('eligibilityRadioError')}`
              : !contactOk
                ? t('contactIncompleteError')
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
