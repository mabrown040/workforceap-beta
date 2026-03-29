'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ApplyFormStatusBar from '@/components/ApplyFormStatusBar';
import { trackApplyFunnel } from '@/lib/analytics/events';

/* ─── constants (all business data preserved exactly) ─── */
const FORMSPREE_ID = 'xpwzkyjo';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

const eligibility = [
  '16 years or older',
  'U.S. Citizen or Permanent Resident',
  'High school diploma or GED (or in process)',
  'Committed to 100% program completion',
  'Willing to participate in job placement assistance services',
  'Access to reliable internet connection & computer',
];

const programs = [
  'Digital Literacy Empowerment Class (6-7 Weeks)',
  'AI Professional Developer Certificate (IBM)',
  'Software & Applications Developer (IBM)',
  'CompTIA A+ Professional Certificate',
  'CompTIA Network+ Professional Certificate',
  'CompTIA Security+ Professional Certificate',
  'Cybersecurity Professional Certificate (Google)',
  'IT Automation with Python (Google)',
  'IT Support Professional Certificate (IBM)',
  'AWS Cloud Technology (Amazon)',
  'Data Analytics Professional Certificate (Google)',
  'Data Science Professional Certificate (IBM)',
  'Digital Marketing & E-Commerce (Google)',
  'Project Management Professional Certificate (Microsoft)',
  'UX Design Professional Certificate (Google)',
  'Medical Coding & Health Information Technology (MCHIT)',
  'Certified Production Technician (CPT)',
  'Certified Logistics Technician (CLT)',
  'Core Construction Skilled Trades Readiness',
  'Not sure — help me choose',
];

const supportOptions = [
  { value: 'math_reading', label: 'Basic Math / Reading Skills' },
  { value: 'ged', label: 'Getting my GED' },
  { value: 'financial', label: 'Budgeting & Financial Counseling' },
  { value: 'housing', label: 'Housing Assistance' },
  { value: 'tanf', label: 'Applying for TANF / Food Stamps or SSI' },
  { value: 'childcare', label: 'Child Care Services' },
  { value: 'mental_health', label: 'Mental Health Services' },
];

const FALLBACK_REFERRAL_SOURCES = [
  'Google / Web Search',
  'Social Media (Facebook, Instagram, LinkedIn)',
  'Friend or Family',
  'Workforce Solutions Capital Area',
  'Texas Workforce Commission (TWC)',
  'Austin Area Urban League',
  'African American Youth Harvest Foundation',
  '211 Texas',
  'Community Organization',
  'Flyer or Brochure',
  'WorkforceAP Counselor',
  'Other',
];

/* ─── styles ─── */
const s = {
  stepTitle: {
    fontSize: 'var(--font-size-h3)',
    fontWeight: 800,
    color: 'var(--color-on-surface)',
    marginBottom: 'var(--space-2)',
  } as React.CSSProperties,

  stepDesc: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-on-surface-variant)',
    lineHeight: 'var(--line-height-normal)',
    marginBottom: 'var(--space-6)',
  } as React.CSSProperties,

  fieldGroup: {
    marginBottom: 'var(--space-4)',
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    color: 'var(--color-on-surface)',
    marginBottom: 'var(--space-1)',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: 'var(--space-3) var(--space-4)',
    fontSize: 'var(--font-size-base)',
    background: 'var(--surface-container)',
    border: '1px solid var(--outline-variant)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-on-surface)',
    outline: 'none',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,

  select: {
    width: '100%',
    padding: 'var(--space-3) var(--space-4)',
    fontSize: 'var(--font-size-base)',
    background: 'var(--surface-container)',
    border: '1px solid var(--outline-variant)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-on-surface)',
    outline: 'none',
  } as React.CSSProperties,

  radioGroup: {
    display: 'flex',
    gap: 'var(--space-4)',
    marginTop: 'var(--space-2)',
  } as React.CSSProperties,

  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-on-surface)',
    cursor: 'pointer',
  } as React.CSSProperties,

  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-4)',
  } as React.CSSProperties,

  fieldset: {
    border: 'none',
    padding: 0,
    margin: '0 0 var(--space-6)',
  } as React.CSSProperties,

  legend: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: 'var(--color-accent)',
    marginBottom: 'var(--space-4)',
    paddingBottom: 'var(--space-2)',
    borderBottom: '1px solid var(--outline-variant)',
    width: '100%',
  } as React.CSSProperties,

  primaryBtn: {
    padding: 'var(--space-4) var(--space-8)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: '#fff',
    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  } as React.CSSProperties,

  secondaryBtn: {
    padding: 'var(--space-4) var(--space-8)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 600,
    color: 'var(--color-on-surface-variant)',
    background: 'transparent',
    border: '1px solid var(--outline-variant)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    textDecoration: 'none',
  } as React.CSSProperties,

  btnRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--space-4)',
    marginTop: 'var(--space-6)',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,

  banner: {
    padding: 'var(--space-4) var(--space-6)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-6)',
    fontSize: 'var(--font-size-sm)',
    lineHeight: 'var(--line-height-normal)',
  } as React.CSSProperties,

  bannerQualify: {
    background: 'rgba(74,155,79,0.1)',
    border: '1px solid rgba(74,155,79,0.3)',
    color: 'var(--color-on-surface)',
  } as React.CSSProperties,

  bannerNeutral: {
    background: 'rgba(255,187,0,0.08)',
    border: '1px solid rgba(255,187,0,0.25)',
    color: 'var(--color-on-surface)',
  } as React.CSSProperties,

  errorBanner: {
    background: 'rgba(173,44,77,0.1)',
    borderLeft: '4px solid var(--color-accent)',
    padding: 'var(--space-3) var(--space-4)',
    marginBottom: 'var(--space-4)',
    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
    color: 'var(--color-on-surface)',
    fontSize: 'var(--font-size-sm)',
  } as React.CSSProperties,

  progressBar: {
    height: 4,
    background: 'var(--surface-container-highest)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 'var(--space-6)',
  } as React.CSSProperties,

  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-dark))',
    borderRadius: 2,
    transition: 'width 0.4s ease',
  } as React.CSSProperties,

  eligibilityList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 var(--space-4)',
  } as React.CSSProperties,

  eligibilityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) 0',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-on-surface-variant)',
    borderBottom: '1px solid var(--outline-variant)',
  } as React.CSSProperties,

  supportGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-2)',
  } as React.CSSProperties,

  supportLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-on-surface)',
    cursor: 'pointer',
    padding: 'var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.15s',
  } as React.CSSProperties,
} as const;

export default function ApplyFlowClient() {
  /* ─── all business logic preserved exactly ─── */
  const [referralSources, setReferralSources] = useState<string[]>(FALLBACK_REFERRAL_SOURCES);
  const [step, setStep] = useState<1 | 2>(1);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      trackApplyFunnel(1, 'started');
      trackApplyFunnel(1, 'legacy_flow_view');
    }
  }, []);

  useEffect(() => {
    fetch('/api/referral-sources')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setReferralSources(data); })
      .catch(() => {}); // silently fall back to static list
  }, []);

  const [q1, setQ1] = useState<'yes' | 'no' | null>(null);
  const [q2, setQ2] = useState<'yes' | 'no' | null>(null);
  const [q3, setQ3] = useState<'yes' | 'no' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const firstName = (formData.get('first_name') as string) ?? '';
    const lastName = (formData.get('last_name') as string) ?? '';
    const program = (formData.get('program') as string) ?? (formData.get('program_interest') as string) ?? 'WorkforceAP Program';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Applicant';
    const applicantEmail = ((formData.get('email') as string) ?? '').trim();

    try {
      trackApplyFunnel(3, 'form_submitted', { qualifies });

      const fsRes = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (!fsRes.ok) {
        throw new Error('Form submission failed');
      }

      trackApplyFunnel(4, 'application_completed', { qualifies });

      try {
        await fetch('/api/member/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: 'WorkforceAP',
            role: program || 'Program Application',
            status: 'APPLIED',
          }),
        });
      } catch {
        // Non-fatal
      }

      if (applicantEmail) {
        try {
          await fetch('/api/apply/confirmation-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: applicantEmail, fullName }),
          });
        } catch {
          // Non-fatal
        }
      }

      const emailQ = applicantEmail ? `?email=${encodeURIComponent(applicantEmail)}` : '';
      window.location.href = `${SITE_URL}/apply/confirmation${emailQ}`;
    } catch {
      setSubmitting(false);
      setSubmitError('Something went wrong submitting your application. Please try again, or call (512) 777-1808.');
    }
  };

  const yesCount = [q1, q2, q3].filter((a) => a === 'yes').length;
  const qualifies = yesCount >= 2;
  const canContinue = q1 !== null && q2 !== null && q3 !== null;

  const goToStep2 = () => {
    if (!canContinue) return;
    trackApplyFunnel(2, 'qualification_completed', { qualifies });
    setStep(2);
  };

  /* ─── UI ─── */
  return (
    <div>
      {/* Progress bar */}
      <div style={s.progressBar}>
        <div style={{ ...s.progressFill, width: step === 1 ? '33%' : '66%' }} />
      </div>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
        Step {step} of 2
      </p>

      {/* ── Step 1: Qualification ── */}
      {step === 1 && (
        <div>
          <h2 style={s.stepTitle}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, verticalAlign: 'middle', marginRight: 'var(--space-2)', color: 'var(--color-accent)' }}>fact_check</span>
            Personal Information
          </h2>
          <p style={s.stepDesc}>See if you qualify for funding assistance. Answer these quick questions to see what options may be available.</p>

          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Are you currently unemployed or underemployed?</label>
              <div style={s.radioGroup}>
                <label style={s.radioLabel}><input type="radio" name="q1" value="yes" checked={q1 === 'yes'} onChange={() => setQ1('yes')} style={{ accentColor: 'var(--color-accent)' }} /> Yes</label>
                <label style={s.radioLabel}><input type="radio" name="q1" value="no" checked={q1 === 'no'} onChange={() => setQ1('no')} style={{ accentColor: 'var(--color-accent)' }} /> No</label>
              </div>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Is your household income below $60,000/year?</label>
              <div style={s.radioGroup}>
                <label style={s.radioLabel}><input type="radio" name="q2" value="yes" checked={q2 === 'yes'} onChange={() => setQ2('yes')} style={{ accentColor: 'var(--color-accent)' }} /> Yes</label>
                <label style={s.radioLabel}><input type="radio" name="q2" value="no" checked={q2 === 'no'} onChange={() => setQ2('no')} style={{ accentColor: 'var(--color-accent)' }} /> No</label>
              </div>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Are you a US resident?</label>
              <div style={s.radioGroup}>
                <label style={s.radioLabel}><input type="radio" name="q3" value="yes" checked={q3 === 'yes'} onChange={() => setQ3('yes')} style={{ accentColor: 'var(--color-accent)' }} /> Yes</label>
                <label style={s.radioLabel}><input type="radio" name="q3" value="no" checked={q3 === 'no'} onChange={() => setQ3('no')} style={{ accentColor: 'var(--color-accent)' }} /> No</label>
              </div>
            </div>
          </div>

          {canContinue && (
            <div style={{ ...s.banner, ...(qualifies ? s.bannerQualify : s.bannerNeutral) }}>
              {qualifies ? (
                <p style={{ margin: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 'var(--space-2)', color: 'var(--color-green)' }}>check_circle</span>
                  <strong>You may qualify for funding assistance.</strong> Complete your application and we&apos;ll connect you with available resources.
                </p>
              ) : (
                <p style={{ margin: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 'var(--space-2)', color: 'var(--color-gold)' }}>info</span>
                  <strong>Your answers do not match our typical funding profile -- you can still apply.</strong> A counselor
                  will review your situation. If you want a gentler first step while you wait, explore{' '}
                  <Link href="/programs/digital-literacy-empowerment-class" style={{ color: 'var(--color-accent)' }}>Digital Literacy</Link> or the{' '}
                  <Link href="/find-your-path" style={{ color: 'var(--color-accent)' }}>pathfinder quiz</Link>.
                </p>
              )}
            </div>
          )}

          {!canContinue && (
            <p style={{ color: 'var(--color-accent)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>warning</span>
              Please answer all questions to continue.
            </p>
          )}

          <div style={s.btnRow}>
            <Link href="/" style={s.secondaryBtn}>Return to Overview</Link>
            <button
              type="button"
              disabled={!canContinue}
              onClick={goToStep2}
              style={{ ...s.primaryBtn, opacity: canContinue ? 1 : 0.5 }}
            >
              Continue to Step 2
              <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginLeft: 'var(--space-2)' }}>arrow_forward</span>
            </button>
          </div>

          <p style={{ marginTop: 'var(--space-6)', fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
            Having trouble? Call{' '}
            <a href="tel:+15127771808" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>(512) 777-1808</a>
          </p>
        </div>
      )}

      {/* ── Step 2: Full Application ── */}
      {step === 2 && (
        <div>
          <h2 style={s.stepTitle}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, verticalAlign: 'middle', marginRight: 'var(--space-2)', color: 'var(--color-accent)' }}>description</span>
            Complete your application
          </h2>
          <p style={s.stepDesc}>Fill out the form below and a counselor will contact you within 24-48 hours.</p>

          {/* Eligibility checklist */}
          <div style={{ background: 'var(--surface-container)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4) var(--space-6)', marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>checklist</span>
              Who Can Apply?
            </h3>
            <ul style={s.eligibilityList}>
              {eligibility.map((item, i) => (
                <li key={i} style={{ ...s.eligibilityItem, borderBottom: i < eligibility.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-green)' }}>check</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleFormSubmit}>
            {submitError && (
              <div role="alert" style={s.errorBanner}>{submitError}</div>
            )}
            <input type="hidden" name="_subject" value="New WorkforceAP Application" />
            <input type="hidden" name="funding_assistance_qualify" value={qualifies ? 'yes' : 'no'} />

            <ApplyFormStatusBar />

            <fieldset style={s.fieldset}>
              <legend style={s.legend}>Personal Information</legend>
              <div style={s.formRow}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>First Name *</label>
                  <input type="text" name="first_name" required style={s.input} />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Last Name *</label>
                  <input type="text" name="last_name" required style={s.input} />
                </div>
              </div>
              <div style={s.formRow}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Phone Number *</label>
                  <input type="tel" name="phone" required style={s.input} />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Email Address *</label>
                  <input type="email" name="email" required style={s.input} />
                </div>
              </div>
            </fieldset>

            <fieldset style={s.fieldset}>
              <legend style={s.legend}>Location</legend>
              <div style={s.fieldGroup}>
                <label style={s.label}>Do you live in Travis County or Austin? *</label>
                <div style={s.radioGroup}>
                  <label style={s.radioLabel}><input type="radio" name="travis_county" value="yes" required style={{ accentColor: 'var(--color-accent)' }} /> Yes</label>
                  <label style={s.radioLabel}><input type="radio" name="travis_county" value="no" style={{ accentColor: 'var(--color-accent)' }} /> No</label>
                </div>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>If no -- what city, state, and county do you live in?</label>
                <input type="text" name="location_other" style={s.input} />
              </div>
            </fieldset>

            <fieldset style={s.fieldset}>
              <legend style={s.legend}>Employment Status</legend>
              <div style={s.fieldGroup}>
                <label style={s.label}>Are you looking for training services to help with skills for a job? *</label>
                <div style={s.radioGroup}>
                  <label style={s.radioLabel}><input type="radio" name="seeking_training" value="yes" required style={{ accentColor: 'var(--color-accent)' }} /> Yes</label>
                  <label style={s.radioLabel}><input type="radio" name="seeking_training" value="no" style={{ accentColor: 'var(--color-accent)' }} /> No</label>
                </div>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Are you currently unemployed (terminated, laid off, or received notice of layoff)? *</label>
                <div style={s.radioGroup}>
                  <label style={s.radioLabel}><input type="radio" name="unemployed" value="yes" required style={{ accentColor: 'var(--color-accent)' }} /> Yes</label>
                  <label style={s.radioLabel}><input type="radio" name="unemployed" value="no" style={{ accentColor: 'var(--color-accent)' }} /> No</label>
                </div>
              </div>
              <div style={s.formRow}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Current Occupation</label>
                  <input type="text" name="occupation" style={s.input} />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Years of Experience</label>
                  <input type="text" name="experience" style={s.input} />
                </div>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Company Laid Off From (if applicable)</label>
                <input type="text" name="laid_off_from" style={s.input} />
              </div>
            </fieldset>

            <fieldset style={s.fieldset}>
              <legend style={s.legend}>Income &amp; Benefits</legend>
              <div style={s.fieldGroup}>
                <label style={s.label}>Are you eligible for TANF or Food Stamps? *</label>
                <div style={s.radioGroup}>
                  <label style={s.radioLabel}><input type="radio" name="tanf" value="yes" required style={{ accentColor: 'var(--color-accent)' }} /> Yes</label>
                  <label style={s.radioLabel}><input type="radio" name="tanf" value="no" style={{ accentColor: 'var(--color-accent)' }} /> No</label>
                </div>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Are you single or married? *</label>
                <div style={s.radioGroup}>
                  <label style={s.radioLabel}><input type="radio" name="marital" value="single" required style={{ accentColor: 'var(--color-accent)' }} /> Single</label>
                  <label style={s.radioLabel}><input type="radio" name="marital" value="married" style={{ accentColor: 'var(--color-accent)' }} /> Married</label>
                </div>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>How many people in your household? *</label>
                <select name="household_size" required style={s.select}>
                  <option value="">Select...</option>
                  <option value="1">1 -- max $12,880/yr</option>
                  <option value="2">2 -- max $17,420/yr</option>
                  <option value="3">3 -- max $22,258/yr</option>
                  <option value="4">4 -- max $27,479/yr</option>
                  <option value="5">5 -- max $32,432/yr</option>
                  <option value="6">6 -- max $37,931/yr</option>
                  <option value="7">7 -- max $43,430/yr</option>
                  <option value="8">8 -- max $48,929/yr</option>
                  <option value="9+">9+ -- max $54,428/yr</option>
                </select>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>What is your yearly household income? *</label>
                <input type="text" name="income" placeholder="e.g. $35,000" required style={s.input} />
              </div>
            </fieldset>

            <fieldset style={s.fieldset}>
              <legend style={s.legend}>Program Interest</legend>
              <div style={s.fieldGroup}>
                <label style={s.label}>What class are you most interested in? *</label>
                <select name="program" required style={s.select}>
                  <option value="">Select a program...</option>
                  {programs.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Best times to contact you by phone?</label>
                <input type="text" name="best_time" placeholder="e.g. Weekday mornings" style={s.input} />
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Best time for a tour?</label>
                <input type="text" name="tour_time" style={s.input} />
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>How did you hear about us?</label>
                <select name="referral" style={s.select}>
                  <option value="">Select...</option>
                  {referralSources.map((src) => <option key={src}>{src}</option>)}
                </select>
              </div>
            </fieldset>

            <fieldset style={s.fieldset}>
              <legend style={s.legend}>Additional Support (Check all that apply)</legend>
              <div style={s.supportGrid}>
                {supportOptions.map((opt) => (
                  <label key={opt.value} style={s.supportLabel}>
                    <input type="checkbox" name="support" value={opt.value} style={{ accentColor: 'var(--color-accent)' }} /> {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div style={s.fieldGroup}>
              <label style={s.label}>Anything else you&rsquo;d like us to know?</label>
              <textarea name="message" rows={4} style={{ ...s.input, resize: 'vertical' as const }} />
            </div>

            <div style={s.btnRow}>
              <button type="button" onClick={() => setStep(1)} style={s.secondaryBtn}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>arrow_back</span>
                Return to Overview
              </button>
              <button type="submit" disabled={submitting} style={{ ...s.primaryBtn, opacity: submitting ? 0.7 : 1, width: 'auto' }}>
                {submitting ? 'Submitting...' : 'Submit Application'}
                <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginLeft: 'var(--space-2)' }}>send</span>
              </button>
            </div>

            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', textAlign: 'center', marginTop: 'var(--space-4)' }}>
              We review every application and respond within 24-48 hours. Your information is kept private.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
