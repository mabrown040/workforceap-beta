'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Mic } from 'lucide-react';
import type { WioaBarrier, WioaEligibilitySignal, WioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';
import { barrierLabel } from '@/lib/wioa/wioaQualification';
import PortalCard from '@/components/portal/ui/PortalCard';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import { PortalInput } from '@/components/portal/ui/PortalInput';
import PortalVoiceSessionLazy from '@/components/portal/PortalVoiceSessionLazy';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';

type ClientMode = 'member' | 'public';

const BARRIERS: WioaBarrier[] = [
  'none',
  'basic_skills',
  'english_language',
  'criminal_record',
  'transportation',
  'childcare',
  'housing',
  'other',
];

const SIGNAL_COPY: Record<WioaEligibilitySignal, { title: string; body: string }> = {
  likely: {
    title: 'Strong next step, talk with staff',
    body:
      'Several of your answers line up with common WIOA pathways. This is still an initial qualification signal, not a final eligibility decision.',
  },
  possible: {
    title: 'You may be a fit',
    body:
      'Your answers suggest WIOA-funded support could make sense. WorkforceAP staff can confirm eligibility, documentation, and timing.',
  },
  review: {
    title: 'Worth a staff review',
    body:
      'We need a little more detail before anyone can say yes or no. A WorkforceAP team member can walk through it with you.',
  },
  unclear: {
    title: 'Youth or special-case review',
    body:
      'Youth programs and some special populations follow different rules. Staff can help you understand the right track and next step.',
  },
};

export default function WioaQualificationClient({
  initialSnapshot,
  mode = 'member',
  submitEndpoint = mode === 'public' ? '/api/public/wioa-qualification' : '/api/member/wioa-qualification',
  voiceSessionEndpoint =
    mode === 'public'
      ? '/api/public/wioa-qualification/voice-session'
      : '/api/member/wioa-qualification/voice-session',
}: {
  initialSnapshot: WioaQualificationSnapshot | null;
  mode?: ClientMode;
  submitEndpoint?: string;
  voiceSessionEndpoint?: string;
}) {
  const isPublic = mode === 'public';
  const [snapshot, setSnapshot] = useState<WioaQualificationSnapshot | null>(initialSnapshot);
  const [entryMode, setEntryMode] = useState<'voice' | 'form'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [staffNotificationSent, setStaffNotificationSent] = useState<boolean | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [ageBracket, setAgeBracket] = useState<'under18' | '18_24' | '25_54' | '55_plus'>('25_54');
  const [countyOrZip, setCountyOrZip] = useState('');
  const [primaryBarrier, setPrimaryBarrier] = useState<WioaBarrier>('none');
  const [dislocatedWorker, setDislocatedWorker] = useState(false);
  const [lowIncomeSelfReport, setLowIncomeSelfReport] = useState(false);
  const [trainingInterest, setTrainingInterest] = useState(true);
  const [completedIntakeSelfReport, setCompletedIntakeSelfReport] = useState(false);
  const [publicAssistanceSelfReport, setPublicAssistanceSelfReport] = useState<boolean | null>(
    initialSnapshot?.answers.publicAssistanceSelfReport ?? null
  );

  const voicePayload = useMemo(
    () => ({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      countyOrZip: countyOrZip.trim(),
      screeningSource: isPublic ? 'public_page' : 'member_portal',
      wioaPronunciation: 'W. I. O. A.',
    }),
    [countyOrZip, email, fullName, isPublic, phone]
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (isPublic && (!fullName.trim() || !email.trim())) {
      setError('Please add your name and email so WorkforceAP can follow up.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(submitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ageBracket,
          countyOrZip: countyOrZip.trim(),
          primaryBarrier,
          dislocatedWorker,
          lowIncomeSelfReport,
          trainingInterest,
          completedIntakeSelfReport,
          publicAssistanceSelfReport,
          ...(isPublic
            ? {
                contact: {
                  fullName: fullName.trim(),
                  email: email.trim(),
                  phone: phone.trim(),
                },
              }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        snapshot?: WioaQualificationSnapshot;
        emailSent?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      if (data.snapshot) setSnapshot(data.snapshot);
      setStaffNotificationSent(data.emailSent === true);
      setEntryMode('form');
    } catch {
      setError('Network error, try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      {!isPublic ? (
        <div style={{ marginBottom: '1.25rem' }}>
          <PortalBreadcrumb
            items={[
              { label: 'Learning Hub', href: '/dashboard/learning' },
              { label: 'WIOA Qualification Assessment' },
            ]}
          />
        </div>
      ) : null}

      <h1 className="portal-page-title" style={{ marginBottom: '0.5rem' }}>
        WIOA Qualification Assessment
      </h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem', lineHeight: 1.55 }}>
        {isPublic
          ? 'Use this quick qualification assessment to see whether Workforce Innovation and Opportunity Act (WIOA) funding may be worth exploring. It is fast, public, and built to help WorkforceAP staff follow up with the right next step.'
          : 'This short qualification assessment helps you prepare for a conversation about Workforce Innovation and Opportunity Act (WIOA) services.'}{' '}
        <strong>It is not a final eligibility determination.</strong> WorkforceAP staff and American Job Centers confirm eligibility with documentation.
      </p>

      {snapshot ? (
        <PortalCard
          title={isPublic ? 'Your qualification result' : 'Last saved qualification'}
          subtitle={new Date(snapshot.submittedAt).toLocaleString()}
          className="wa-mb-6"
        >
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{SIGNAL_COPY[snapshot.signal].title}</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
            {SIGNAL_COPY[snapshot.signal].body}
          </p>
          <ul style={{ margin: '1rem 0 0', paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
            {snapshot.reasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
          {staffNotificationSent === true ? (
            <p role="status" style={{ margin: '1rem 0 0', color: 'var(--color-success, #166534)', fontSize: '0.9rem', fontWeight: 600 }}>
              Your screening was saved and the WorkforceAP team was notified.
            </p>
          ) : staffNotificationSent === false ? (
            <p role="alert" style={{ margin: '1rem 0 0', color: 'var(--color-warning-dark, #92400e)', fontSize: '0.9rem', fontWeight: 600 }}>
              Your screening was saved, but staff email delivery could not be confirmed. The team can still review it in the portal.
            </p>
          ) : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
            {isPublic ? (
              <>
                <Link href="/apply" className="btn btn-primary">
                  Start the application
                </Link>
                <Link href="/contact?topic=wioa" className="btn btn-muted">
                  Talk to WorkforceAP
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard/messages" className="btn btn-primary">
                  Message your counselor
                </Link>
                <Link href="/dashboard/learning" className="btn btn-muted">
                  Back to learning hub
                </Link>
              </>
            )}
          </div>
        </PortalCard>
      ) : null}

      <PortalCard
        title="Choose how to complete it"
        subtitle={
          isPublic
            ? 'The assessment form sends your answers to WorkforceAP. Voice is available to help you prepare.'
            : 'The assessment form saves your answers for staff review. Voice is available to help you prepare.'
        }
      >
        <div
          role="tablist"
          aria-label="WIOA Qualification Assessment mode"
          style={{
            display: 'inline-flex',
            padding: '0.25rem',
            borderRadius: '999px',
            background: 'var(--surface-container-high)',
            gap: '0.25rem',
            marginBottom: '1rem',
          }}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const next = entryMode === 'voice' ? 'form' : 'voice';
            setEntryMode(next);
            document.getElementById(`wioa-tab-${next}`)?.focus();
          }}
        >
          <button
            type="button"
            role="tab"
            id="wioa-tab-voice"
            aria-selected={entryMode === 'voice'}
            aria-controls="wioa-tabpanel"
            tabIndex={entryMode === 'voice' ? 0 : -1}
            onClick={() => setEntryMode('voice')}
            className={entryMode === 'voice' ? 'btn btn-primary' : 'btn btn-muted'}
          >
            Voice preparation only
          </button>
          <button
            type="button"
            role="tab"
            id="wioa-tab-form"
            aria-selected={entryMode === 'form'}
            aria-controls="wioa-tabpanel"
            tabIndex={entryMode === 'form' ? 0 : -1}
            onClick={() => setEntryMode('form')}
            className={entryMode === 'form' ? 'btn btn-primary' : 'btn btn-muted'}
          >
            Assessment form
          </button>
        </div>

        <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55, fontSize: '0.93rem' }}>
          {isPublic
            ? 'Submit the assessment form to send your answers to WorkforceAP for follow-up. Voice is preparation only and does not save or send your answers.'
            : 'Submit the assessment form to save your answers for staff review. Voice is preparation only and does not save or send your answers.'}
        </p>

        <div
          id="wioa-tabpanel"
          role="tabpanel"
          aria-labelledby={entryMode === 'voice' ? 'wioa-tab-voice' : 'wioa-tab-form'}
        >
        {entryMode === 'voice' ? (
          <>
            {isPublic ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <PortalInput
                  label="Your name (optional for voice)"
                  id="wioa-public-name-voice"
                  type="text"
                  maxLength={120}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                />
                <PortalInput
                  label="Email (optional for voice)"
                  id="wioa-public-email-voice"
                  type="email"
                  maxLength={200}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  autoComplete="email"
                />
              </div>
            ) : null}
            <VoiceAgentSurface
              badge="Voice preparation only"
              headline="Practice the WIOA conversation"
              subtext={
                isPublic
                  ? 'Practice talking through your goals and barriers, then return to the form to send your answers to our team.'
                  : 'Practice talking through your goals and barriers, then return to the form to save your answers for staff review.'
              }
              icon={<Mic size={22} aria-hidden="true" />}
              glowColor="#2b7bb9"
              gradient="linear-gradient(135deg, #99f6e4 0%, #14b8a6 45%, #0f766e 100%)"
            >
              <PortalVoiceSessionLazy
                sessionEndpoint={voiceSessionEndpoint}
                sessionPayload={voicePayload}
                title="WIOA conversation practice"
                description="Practice talking through your work goals and barriers before completing the assessment form."
                fallbackAgentNotice="The WIOA guide is unavailable right now, so you are practicing with Lilley, the WorkforceAP career coach. Lilley can still talk through your goals and barriers; use the form to save your answers."
                accent="#2b7bb9"
                accentDark="#1f5a87"
                speakingLabel="Guide is speaking…"
                listeningLabel="Listening…"
              />
            </VoiceAgentSurface>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            {isPublic ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '0.25rem',
                }}
              >
                <PortalInput
                  label="Full name"
                  id="wioa-public-name"
                  type="text"
                  maxLength={120}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  required
                />
                <PortalInput
                  label="Email"
                  id="wioa-public-email"
                  type="email"
                  maxLength={200}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  autoComplete="email"
                  required
                />
                <PortalInput
                  label="Phone (optional)"
                  id="wioa-public-phone"
                  type="tel"
                  maxLength={40}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  autoComplete="tel"
                />
              </div>
            ) : null}

            <div className="portal-field">
              <label className="portal-field__label" htmlFor="wioa-age">
                Age group
              </label>
              <select
                id="wioa-age"
                className="portal-input"
                value={ageBracket}
                onChange={(e) => setAgeBracket(e.target.value as typeof ageBracket)}
              >
                <option value="under18">Under 18</option>
                <option value="18_24">18–24</option>
                <option value="25_54">25–54</option>
                <option value="55_plus">55+</option>
              </select>
            </div>

            <PortalInput
              label="County or ZIP (optional)"
              id="wioa-zip"
              type="text"
              maxLength={120}
              value={countyOrZip}
              onChange={(e) => setCountyOrZip(e.target.value)}
              placeholder="e.g. Travis County or 78701"
              autoComplete="postal-code"
            />

            <div className="portal-field">
              <label className="portal-field__label" htmlFor="wioa-barrier">
                Primary barrier to work or training
              </label>
              <select
                id="wioa-barrier"
                className="portal-input"
                value={primaryBarrier}
                onChange={(e) => setPrimaryBarrier(e.target.value as WioaBarrier)}
              >
                {BARRIERS.map((barrier) => (
                  <option key={barrier} value={barrier}>
                    {barrierLabel(barrier)}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="portal-choice-group">
              <legend className="portal-field__label">Your work situation</legend>
              <label className="portal-choice">
                <input
                  type="checkbox"
                  className="portal-choice__input"
                  checked={dislocatedWorker}
                  onChange={(e) => setDislocatedWorker(e.target.checked)}
                />
                <span className="portal-choice__text portal-choice__text--strong">
                  I am currently unemployed or was laid off
                  <span className="portal-choice__meta">On its own, this qualifies you for WIOA services.</span>
                </span>
              </label>
              <label className="portal-choice">
                <input
                  type="checkbox"
                  className="portal-choice__input"
                  checked={lowIncomeSelfReport}
                  onChange={(e) => setLowIncomeSelfReport(e.target.checked)}
                />
                <span className="portal-choice__text">
                  My household income is limited or near self-sufficiency
                  <span className="portal-choice__meta">WIOA asks for additional documentation for this.</span>
                </span>
              </label>
            </fieldset>

            <fieldset className="portal-choice-group portal-choice-group--inline">
              <legend className="portal-field__label">
                Are you receiving TANF, WIC, and/or Food stamps (SNAP)?
              </legend>
              {([
                { value: true, label: 'Yes' },
                { value: false, label: 'No' },
              ] as const).map((option) => (
                <label key={option.label} className="portal-choice portal-choice--inline">
                  <input
                    type="radio"
                    className="portal-choice__input"
                    name="wioa-public-assistance"
                    value={option.label.toLowerCase()}
                    checked={publicAssistanceSelfReport === option.value}
                    onChange={() => setPublicAssistanceSelfReport(option.value)}
                  />
                  <span className="portal-choice__text">{option.label}</span>
                </label>
              ))}
            </fieldset>

            <fieldset className="portal-choice-group">
              <legend className="portal-field__label">Training and next steps</legend>
              <label className="portal-choice">
                <input
                  type="checkbox"
                  className="portal-choice__input"
                  checked={trainingInterest}
                  onChange={(e) => setTrainingInterest(e.target.checked)}
                />
                <span className="portal-choice__text">I want training that leads to an in-demand job</span>
              </label>
              <label className="portal-choice">
                <input
                  type="checkbox"
                  className="portal-choice__input"
                  checked={completedIntakeSelfReport}
                  onChange={(e) => setCompletedIntakeSelfReport(e.target.checked)}
                />
                <span className="portal-choice__text">I have already completed WorkforceAP intake or orientation</span>
              </label>
            </fieldset>

            {error ? (
              <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.9rem' }}>
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? isPublic
                  ? 'Sending…'
                  : 'Saving…'
                : isPublic
                  ? 'Send screening'
                  : snapshot
                    ? 'Update screening'
                    : 'Save screening'}
            </button>
          </form>
        )}
        </div>
      </PortalCard>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Next steps</h2>
        <ol style={{ paddingLeft: '1.25rem', lineHeight: 1.6, fontSize: '0.92rem', color: 'var(--color-on-surface-variant)' }}>
          <li>
            <strong>Bring to your appointment:</strong> photo ID, proof of income if asked, and any layoff or unemployment notices.
          </li>
          <li>
            <strong>WorkforceAP counselor:</strong> go see your Workforce advancement counselor to confirm eligibility and next steps.
          </li>
          <li>
            <strong>What to say:</strong> “I&rsquo;m interested in WIOA-funded training and I&rsquo;d like to confirm eligibility and next steps.”
          </li>
        </ol>
      </section>
    </div>
  );
}
