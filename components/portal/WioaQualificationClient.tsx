'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { WioaBarrier, WioaEligibilitySignal, WioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';
import { barrierLabel } from '@/lib/wioa/wioaQualification';
import PortalCard from '@/components/portal/ui/PortalCard';
import { PortalInput } from '@/components/portal/ui/PortalInput';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { getCounselorTtsVoiceId } from '@/lib/portal/counselorVoice';

const WIOA_FRIENDLY_VOICE_ID = getCounselorTtsVoiceId();

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
    title: 'Next step: talk with staff',
    body:
      'Several of your answers match common WIOA pathways. This is not a final determination — a counselor or American Job Center can confirm eligibility and services.',
  },
  possible: {
    title: 'You may qualify',
    body:
      'Your answers suggest you could be a good fit for WIOA-funded services. Staff will review income, barriers, and documentation.',
  },
  review: {
    title: 'Plan a review',
    body:
      'Eligibility depends on details we did not collect here. Schedule time with WorkforceAP or visit a local American Job Center.',
  },
  unclear: {
    title: 'Youth or special cases',
    body:
      'Youth programs and some populations follow different rules. Staff will help you understand options (including WIOA Youth).',
  },
};

export default function WioaQualificationClient({ initialSnapshot }: { initialSnapshot: WioaQualificationSnapshot | null }) {
  const [snapshot, setSnapshot] = useState<WioaQualificationSnapshot | null>(initialSnapshot);
  const [entryMode, setEntryMode] = useState<'voice' | 'form'>('voice');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [ageBracket, setAgeBracket] = useState<'under18' | '18_24' | '25_54' | '55_plus'>('25_54');
  const [countyOrZip, setCountyOrZip] = useState('');
  const [primaryBarrier, setPrimaryBarrier] = useState<WioaBarrier>('none');
  const [dislocatedWorker, setDislocatedWorker] = useState(false);
  const [lowIncomeSelfReport, setLowIncomeSelfReport] = useState(false);
  const [trainingInterest, setTrainingInterest] = useState(true);
  const [completedIntakeSelfReport, setCompletedIntakeSelfReport] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/member/wioa-qualification', {
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
        }),
      });
      const data = (await res.json()) as { snapshot?: WioaQualificationSnapshot; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      if (data.snapshot) setSnapshot(data.snapshot);
    } catch {
      setError('Network error — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <nav className="portal-breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: '1.25rem' }}>
        <Link href="/dashboard/learning">Learning Hub</Link>
        <span style={{ margin: '0 0.35rem' }}>/</span>
        <span>WIOA screening</span>
      </nav>

      <h1 className="portal-page-title" style={{ marginBottom: '0.5rem' }}>
        WIOA eligibility screening
      </h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem', lineHeight: 1.55 }}>
        This short questionnaire helps you prepare for a conversation about Workforce Innovation and Opportunity Act (WIOA)
        services. <strong>It is not a legal eligibility determination.</strong> Counselors and American Job Centers confirm
        eligibility with documentation.
      </p>

      {snapshot ? (
        <PortalCard
          title="Last saved"
          subtitle={new Date(snapshot.submittedAt).toLocaleString()}
          className="wa-mb-6"
        >
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{SIGNAL_COPY[snapshot.signal].title}</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
            {SIGNAL_COPY[snapshot.signal].body}
          </p>
          <ul style={{ margin: '1rem 0 0', paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
            {snapshot.reasons.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </PortalCard>
      ) : null}

      <PortalCard title="Start with voice or switch to the form" subtitle="Voice is the default guided pre-check, and you can switch to the form any time.">
        <div
          role="tablist"
          aria-label="WIOA screening mode"
          style={{
            display: 'inline-flex',
            padding: '0.25rem',
            borderRadius: '999px',
            background: 'var(--color-surface-2, rgba(0,0,0,0.04))',
            gap: '0.25rem',
            marginBottom: '1rem',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={entryMode === 'voice'}
            onClick={() => setEntryMode('voice')}
            className={entryMode === 'voice' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            Voice pre-check
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={entryMode === 'form'}
            onClick={() => setEntryMode('form')}
            className={entryMode === 'form' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            Fill out the form instead
          </button>
        </div>

        <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55, fontSize: '0.93rem' }}>
          The voice option is meant to feel like a quick guided intake. If you would rather type, switch to the form and we will save the same kind of pre-screening details for staff review.
        </p>

        {entryMode === 'voice' ? (
          <VoiceAgentSurface
            badge="Voice pre-check"
            headline="WIOA pre-qualification guide"
            subtext="Talk through a quick pre-check before staff reviews your eligibility."
            icon="🎙️"
            glowColor="#0d9488"
            gradient="linear-gradient(135deg, #99f6e4 0%, #14b8a6 45%, #0f766e 100%)"
          >
            <PortalVoiceSession
              sessionEndpoint="/api/member/wioa-qualification/voice-session"
              title="WIOA pre-check"
              description="Talk through your work goals, barriers, and likely eligibility before the formal review."
              accent="#0d9488"
              accentDark="#0f766e"
              speakingLabel="Guide is speaking…"
              listeningLabel="Listening…"
              conversationOverrides={{ tts: { voiceId: WIOA_FRIENDLY_VOICE_ID } }}
            />
          </VoiceAgentSurface>
        ) : (
          <form onSubmit={onSubmit}>
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
                {BARRIERS.map((b) => (
                  <option key={b} value={b}>
                    {barrierLabel(b)}
                  </option>
                ))}
              </select>
            </div>

            <div className="portal-field">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={dislocatedWorker} onChange={(e) => setDislocatedWorker(e.target.checked)} />
                <span>I am unemployed or was laid off from my last job (dislocated worker)</span>
              </label>
            </div>

            <div className="portal-field">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={lowIncomeSelfReport} onChange={(e) => setLowIncomeSelfReport(e.target.checked)} />
                <span>My household income is limited or near self-sufficiency (self-reported)</span>
              </label>
            </div>

            <div className="portal-field">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={trainingInterest} onChange={(e) => setTrainingInterest(e.target.checked)} />
                <span>I am interested in training for an in-demand occupation</span>
              </label>
            </div>

            <div className="portal-field">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={completedIntakeSelfReport}
                  onChange={(e) => setCompletedIntakeSelfReport(e.target.checked)}
                />
                <span>I have completed WorkforceAP intake or orientation (self-reported)</span>
              </label>
            </div>

            {error ? (
              <p role="alert" style={{ color: '#b91c1c', fontSize: '0.9rem' }}>
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : snapshot ? 'Update screening' : 'Save screening'}
            </button>
          </form>
        )}
      </PortalCard>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Pre-test &amp; next steps</h2>
        <ol style={{ paddingLeft: '1.25rem', lineHeight: 1.6, fontSize: '0.92rem', color: 'var(--color-on-surface-variant)' }}>
          <li>
            <strong>Bring to your appointment:</strong> photo ID, proof of income if asked, and any layoff or unemployment
            notices.
          </li>
          <li>
            <strong>American Job Center:</strong> use{' '}
            <a href="https://www.careeronestop.org/LocalHelp/service-locator.aspx" target="_blank" rel="noopener noreferrer">
              CareerOneStop Service Locator
            </a>{' '}
            to find a one-stop near you.
          </li>
          <li>
            <strong>What to say:</strong> “I’m interested in WIOA-funded training. I completed a self-screening in the
            WorkforceAP portal and would like to confirm eligibility and next steps.”
          </li>
        </ol>
      </section>
    </div>
  );
}
