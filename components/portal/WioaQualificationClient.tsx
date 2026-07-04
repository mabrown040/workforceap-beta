'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Mic } from 'lucide-react';
import type { WioaBarrier, WioaEligibilitySignal, WioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';
import { barrierLabel } from '@/lib/wioa/wioaQualification';
import PortalCard from '@/components/portal/ui/PortalCard';
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
  const [entryMode, setEntryMode] = useState<'voice' | 'form'>('voice');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      const data = (await res.json()) as { snapshot?: WioaQualificationSnapshot; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      if (data.snapshot) setSnapshot(data.snapshot);
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
        <nav className="portal-breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: '1.25rem' }}>
          <Link href="/dashboard/learning">Learning Hub</Link>
          <span style={{ margin: '0 0.35rem' }}>/</span>
          <span>WIOA Qualification Assessment</span>
        </nav>
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
            ? 'Use voice for a quick walkthrough, or switch to the form to send your qualification assessment to WorkforceAP.'
            : 'Use voice for a guided qualification check, or switch to the form any time.'
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
            Voice qualification check
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
            Fill out the assessment form
          </button>
        </div>

        <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55, fontSize: '0.93rem' }}>
          {isPublic
            ? 'The voice option is a quick guided conversation. The form is what sends a structured qualification assessment to WorkforceAP for follow-up.'
            : 'The voice option is meant to feel like a quick guided intake. If you would rather type, switch to the form and we will save the same qualification details for staff review.'}
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
              badge="Voice qualification check"
              headline="WIOA Qualification guide"
              subtext={
                isPublic
                  ? 'Talk through a quick walkthrough, then use the form to send the structured qualification assessment to our team.'
                  : 'Talk through your goals, barriers, and likely qualification before staff reviews the details.'
              }
              icon={<Mic size={22} aria-hidden="true" />}
              glowColor="#2b7bb9"
              gradient="linear-gradient(135deg, #99f6e4 0%, #14b8a6 45%, #0f766e 100%)"
            >
              <PortalVoiceSessionLazy
                sessionEndpoint={voiceSessionEndpoint}
                sessionPayload={voicePayload}
                title="WIOA Qualification Assessment"
                description="Talk through your work goals, barriers, and likely qualification before the formal review."
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

            <div className="portal-field">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', minHeight: '44px', paddingBlock: '0.25rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={dislocatedWorker} onChange={(e) => setDislocatedWorker(e.target.checked)} />
                <span><strong>I am currently unemployed or was laid off</strong> — this is a standalone WIOA qualifier</span>
              </label>
            </div>

            <div className="portal-field">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', minHeight: '44px', paddingBlock: '0.25rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={lowIncomeSelfReport} onChange={(e) => setLowIncomeSelfReport(e.target.checked)} />
                <span>My household income is limited or near self-sufficiency (additional documentation for WIOA)</span>
              </label>
            </div>

            <div className="portal-field">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', minHeight: '44px', paddingBlock: '0.25rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={trainingInterest} onChange={(e) => setTrainingInterest(e.target.checked)} />
                <span>I want training that leads to an in-demand job</span>
              </label>
            </div>

            <div className="portal-field">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', minHeight: '44px', paddingBlock: '0.25rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={completedIntakeSelfReport}
                  onChange={(e) => setCompletedIntakeSelfReport(e.target.checked)}
                />
                <span>I have already completed WorkforceAP intake or orientation</span>
              </label>
            </div>

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
