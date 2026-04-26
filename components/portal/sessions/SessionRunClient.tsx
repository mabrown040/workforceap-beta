'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, FileText, Loader2, MessagesSquare, Mic, PenLine, Sparkles, User } from 'lucide-react';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { resumeCoachVoiceSurface } from '@/lib/portal/voice';

type ToolKey = 'resume' | 'coverLetter' | 'interview';

type Status = 'idle' | 'running' | 'done' | 'error';

type ToolState = {
  status: Status;
  error: string | null;
  output: string | null;
  // tool-specific input snapshot for the email packet
  context: string | null;
};

const initialToolState: ToolState = { status: 'idle', error: null, output: null, context: null };

interface Props {
  memberId: string;
  memberFullName: string;
  memberEmail: string;
  memberPhone: string | null;
  memberTargetRole: string | null;
  sessionId: string;
  existingResume: string;
  isFreshWalkIn: boolean;
}

/**
 * Session run page client. Stacked cards walk counselor + member through:
 *
 *   1. Profile snapshot — show what we know, link out to full edit
 *   2. Resume rewriter — paste resume, frame it for the target role
 *   3. Cover letter — feed in a job description, generate tailored letter
 *   4. Interview prep — generate role-targeted practice questions + answers
 *
 * Each AI tool POST includes `subjectMemberId` + `sessionId` so the run
 * lands in the MEMBER's history (not the counselor's) and can be grouped
 * later as "Your session with {actor} on {date}" on the member dashboard.
 *
 * "End session" emails the cumulative packet to the member.
 */
export default function SessionRunClient({
  memberId,
  memberFullName,
  memberEmail,
  memberPhone,
  memberTargetRole,
  sessionId,
  existingResume,
  isFreshWalkIn,
}: Props) {
  const router = useRouter();

  // Per-tool state
  const [resumeState, setResumeState] = useState<ToolState>(initialToolState);
  const [coverState, setCoverState] = useState<ToolState>(initialToolState);
  const [interviewState, setInterviewState] = useState<ToolState>(initialToolState);

  // Per-tool inputs
  const [resumeText, setResumeText] = useState(existingResume);
  const [jobTarget, setJobTarget] = useState(memberTargetRole ?? '');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [interviewLevel, setInterviewLevel] = useState<'entry' | 'mid' | 'senior'>('entry');

  // Wrap-up state
  const [endingSession, setEndingSession] = useState(false);
  const [packetSent, setPacketSent] = useState(false);
  const [packetError, setPacketError] = useState<string | null>(null);

  // Voice walk-through state — captures the live conversation transcript
  // so it can pre-fill the typing forms below (counselor reviews, then
  // runs each tool with voice-captured inputs).
  const [voiceTranscript, setVoiceTranscript] = useState<string[]>([]);
  const [voiceComplete, setVoiceComplete] = useState(false);
  const handleTranscriptChunk = useCallback((chunk: { speaker: 'agent' | 'user'; text: string }) => {
    setVoiceTranscript((prev) => [...prev, `${chunk.speaker === 'user' ? 'Member' : 'Coach'}: ${chunk.text}`]);
  }, []);
  const handleVoicePhaseChange = useCallback((phase: string) => {
    if (phase === 'done') setVoiceComplete(true);
  }, []);
  const transcriptText = voiceTranscript.join('\n');

  const useTranscriptAsResume = () => {
    if (!transcriptText) return;
    // Filter to just member speech for the resume input.
    const memberOnly = voiceTranscript
      .filter((line) => line.startsWith('Member:'))
      .map((line) => line.replace(/^Member: /, ''))
      .join('\n');
    setResumeText(memberOnly.length > 50 ? memberOnly : transcriptText);
  };

  const hasAnyOutput = !!(resumeState.output || coverState.output || interviewState.output);
  const allRun = !!(resumeState.output && coverState.output && interviewState.output);

  const runTool = async (
    key: ToolKey,
    setState: (next: ToolState) => void,
    endpoint: string,
    body: Record<string, unknown>,
    contextLabel: string,
    parseOutput: (data: unknown) => string,
  ) => {
    setState({ ...initialToolState, status: 'running' });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, subjectMemberId: memberId, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ status: 'error', error: data.error ?? 'Tool failed', output: null, context: contextLabel });
        return;
      }
      setState({ status: 'done', error: null, output: parseOutput(data), context: contextLabel });
    } catch (err) {
      console.error(`[session-run:${key}]`, err);
      setState({ status: 'error', error: 'Network error', output: null, context: contextLabel });
    }
  };

  const runResume = () =>
    runTool(
      'resume',
      setResumeState,
      '/api/ai/resume-rewriter',
      { resume: resumeText, jobTarget, targetLocation: '', targetSalary: '' },
      jobTarget,
      (d) => (d as { output?: string }).output ?? '',
    );

  const runCover = () =>
    runTool(
      'coverLetter',
      setCoverState,
      '/api/ai/cover-letter',
      { resume: resumeText, jobDescription, companyName: companyName || 'the company', tone: 'confident' },
      `${companyName || 'cover letter'} — ${jobTarget || 'role'}`,
      (d) => (d as { output?: string }).output ?? '',
    );

  const runInterview = () =>
    runTool(
      'interview',
      setInterviewState,
      '/api/ai/interview-practice',
      { role: jobTarget, experienceLevel: interviewLevel, count: 6, resumeContext: resumeText },
      `${jobTarget} (${interviewLevel})`,
      (d) => JSON.stringify((d as { questions?: unknown }).questions ?? []),
    );

  const endSession = async () => {
    setEndingSession(true);
    setPacketError(null);
    try {
      const res = await fetch('/api/counselor/sessions/email-packet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPacketError(data.error ?? 'Failed to send packet');
        setEndingSession(false);
        return;
      }
      setPacketSent(true);
      setEndingSession(false);
      // Stay on page so counselor can review what they shipped.
    } catch (err) {
      console.error('[session-run:end]', err);
      setPacketError('Network error sending packet');
      setEndingSession(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '960px' }}>
      {isFreshWalkIn ? (
        <div className="portal-card portal-card--flat" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(74,155,79,0.08)', borderLeft: '4px solid var(--color-green, #4a9b4f)' }}>
          <CheckCircle2 size={20} style={{ color: 'var(--color-green, #4a9b4f)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-on-surface)' }}>
            Account created. <strong>{memberEmail}</strong> will get a welcome email with a sign-in link
            once you click <em>End session</em>.
          </p>
        </div>
      ) : null}

      {/* ── Voice walk-through (primary path) ──
          Per user direction (2026-04-26): "we want these to be all voice
          tools here." Counselor + member talk through profile → resume →
          cover letter → interview prep in one voice conversation. The live
          transcript is captured so the typing forms below get pre-filled
          for review/finalization. */}
      <SectionCard
        step={0}
        title="Voice walk-through"
        Icon={Mic}
        accent="#2563eb"
        statusBadge={voiceComplete ? 'Recorded' : voiceTranscript.length > 0 ? 'Live' : 'Ready'}
      >
        <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
          Talk through {memberFullName.split(' ')[0]}&rsquo;s background out loud — the agent will guide
          you through profile, work history, target role, and interview prep in one conversation. We&rsquo;ll
          capture the transcript and pre-fill the tools below so you can review and run each one.
        </p>
        <VoiceAgentSurface {...resumeCoachVoiceSurface}>
          <PortalVoiceSession
            sessionEndpoint="/api/counselor/sessions/voice-walkthrough"
            sessionPayload={{ memberId, sessionId }}
            title={`Build ${memberFullName.split(' ')[0]}'s session out loud`}
            titleAs="h3"
            description="Resume coach + cover letter + interview prep, all in one voice session."
            accent="#2563eb"
            accentDark="#1e40af"
            speakingLabel="Coach is speaking…"
            listeningLabel="Listening — answer out loud"
            onTranscriptChunk={handleTranscriptChunk}
            onPhaseChange={handleVoicePhaseChange}
            showLiveTranscript
            liveTranscriptCoachLabel="Coach"
            liveTranscriptYouLabel={memberFullName.split(' ')[0]}
            retryWithoutDynamicVariables={false}
          />
        </VoiceAgentSurface>
        {voiceTranscript.length > 0 ? (
          <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                {voiceTranscript.length} transcript line{voiceTranscript.length === 1 ? '' : 's'} captured
              </p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                Use as the resume input below, then refine + click &ldquo;Build resume.&rdquo;
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={useTranscriptAsResume}
              disabled={transcriptText.length < 30}
            >
              Pre-fill resume input &rarr;
            </button>
          </div>
        ) : null}
      </SectionCard>

      {/* Card 1: Profile snapshot */}
      <SectionCard
        step={1}
        title="Profile"
        Icon={User}
        accent="#2b7bb9"
        statusBadge={memberPhone ? 'On file' : 'Needs detail'}
      >
        <p style={{ margin: '0 0 0.75rem', color: 'var(--color-on-surface-variant)' }}>
          What we know so far. Click <strong>Edit profile</strong> to fill in WIOA-eligibility fields,
          employment status, and longer bio — then come back here to keep going.
        </p>
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem 1.5rem', margin: 0 }}>
          <ProfileField label="Name" value={memberFullName} />
          <ProfileField label="Email" value={memberEmail} />
          <ProfileField label="Phone" value={memberPhone ?? '—'} />
          <ProfileField label="Target role" value={memberTargetRole ?? (jobTarget || '—')} />
        </dl>
        <div style={{ marginTop: '1rem' }}>
          <Link
            href={`/counselor/students/${memberId}`}
            target="_blank"
            rel="noopener"
            className="btn btn-secondary btn-small"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <PenLine size={16} aria-hidden /> Edit full profile
            <ExternalLink size={14} aria-hidden />
          </Link>
        </div>
      </SectionCard>

      {/* Card 2: Resume rewriter */}
      <SectionCard
        step={2}
        title="Resume rewriter"
        Icon={FileText}
        accent="var(--color-accent)"
        statusBadge={
          resumeState.status === 'running' ? 'Running' :
          resumeState.output ? 'Done' :
          resumeState.error ? 'Failed' :
          'Ready'
        }
      >
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-job-target">
            Target role <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <input
            id="session-job-target"
            type="text"
            value={jobTarget}
            onChange={(e) => setJobTarget(e.target.value)}
            placeholder="IT Support Specialist"
            disabled={resumeState.status === 'running'}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-resume-text">
            Resume / experience <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <textarea
            id="session-resume-text"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={8}
            placeholder="Paste their resume, or type out their work history together — jobs, dates, what they did."
            disabled={resumeState.status === 'running'}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-small"
          onClick={runResume}
          disabled={resumeState.status === 'running' || !jobTarget.trim() || resumeText.trim().length < 50}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          {resumeState.status === 'running' ? (
            <Loader2 size={16} className="ai-tool-submit-spinner" aria-hidden />
          ) : (
            <Sparkles size={16} aria-hidden />
          )}
          {resumeState.status === 'running' ? 'Generating…' : resumeState.output ? 'Re-run' : 'Build resume'}
        </button>
        {resumeState.error ? (
          <p role="alert" style={{ color: 'var(--color-accent)', marginTop: '0.5rem' }}>{resumeState.error}</p>
        ) : null}
        {resumeState.output ? (
          <OutputPanel label="Polished resume" body={resumeState.output} savedTo={memberFullName} />
        ) : null}
      </SectionCard>

      {/* Card 3: Cover letter */}
      <SectionCard
        step={3}
        title="Cover letter"
        Icon={MessagesSquare}
        accent="var(--color-gold, #a47f38)"
        statusBadge={
          coverState.status === 'running' ? 'Running' :
          coverState.output ? 'Done' :
          coverState.error ? 'Failed' :
          'Ready'
        }
      >
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-company-name">Company name</label>
          <input
            id="session-company-name"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Corp"
            disabled={coverState.status === 'running'}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-job-desc">
            Job description <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <textarea
            id="session-job-desc"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={5}
            placeholder="Paste the job posting they want to apply to."
            disabled={coverState.status === 'running'}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-small"
          onClick={runCover}
          disabled={coverState.status === 'running' || jobDescription.trim().length < 20 || resumeText.trim().length < 50}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          {coverState.status === 'running' ? (
            <Loader2 size={16} className="ai-tool-submit-spinner" aria-hidden />
          ) : (
            <Sparkles size={16} aria-hidden />
          )}
          {coverState.status === 'running' ? 'Generating…' : coverState.output ? 'Re-run' : 'Build cover letter'}
        </button>
        {coverState.error ? (
          <p role="alert" style={{ color: 'var(--color-accent)', marginTop: '0.5rem' }}>{coverState.error}</p>
        ) : null}
        {coverState.output ? (
          <OutputPanel label="Tailored cover letter" body={coverState.output} savedTo={memberFullName} />
        ) : null}
      </SectionCard>

      {/* Card 4: Interview prep */}
      <SectionCard
        step={4}
        title="Interview prep"
        Icon={MessagesSquare}
        accent="#2b7bb9"
        statusBadge={
          interviewState.status === 'running' ? 'Running' :
          interviewState.output ? 'Done' :
          interviewState.error ? 'Failed' :
          'Ready'
        }
      >
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-interview-level">Experience level</label>
          <select
            id="session-interview-level"
            value={interviewLevel}
            onChange={(e) => setInterviewLevel(e.target.value as 'entry' | 'mid' | 'senior')}
            disabled={interviewState.status === 'running'}
          >
            <option value="entry">Entry-level (0–2 years)</option>
            <option value="mid">Mid-level (3–7 years)</option>
            <option value="senior">Senior (8+ years)</option>
          </select>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-small"
          onClick={runInterview}
          disabled={interviewState.status === 'running' || !jobTarget.trim()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          {interviewState.status === 'running' ? (
            <Loader2 size={16} className="ai-tool-submit-spinner" aria-hidden />
          ) : (
            <Sparkles size={16} aria-hidden />
          )}
          {interviewState.status === 'running' ? 'Generating…' : interviewState.output ? 'Re-run' : 'Generate questions'}
        </button>
        {interviewState.error ? (
          <p role="alert" style={{ color: 'var(--color-accent)', marginTop: '0.5rem' }}>{interviewState.error}</p>
        ) : null}
        {interviewState.output ? (
          <InterviewOutput body={interviewState.output} savedTo={memberFullName} />
        ) : null}
      </SectionCard>

      {/* End session footer */}
      <div className="portal-card portal-card--flat" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--color-on-surface)' }}>
            {packetSent ? `Packet emailed to ${memberEmail}` : 'End session & email packet'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
            {packetSent
              ? 'They’ll get a welcome email and the resume / cover letter / interview prep packet shortly.'
              : `Send ${memberFullName.split(' ')[0]} an email with everything you built today. They can sign in to see it later, too.`}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={endSession}
          disabled={endingSession || !hasAnyOutput || packetSent}
          title={!hasAnyOutput ? 'Run at least one tool before ending the session' : undefined}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {endingSession ? <Loader2 size={18} className="ai-tool-submit-spinner" aria-hidden /> : <Sparkles size={18} aria-hidden />}
          {packetSent ? 'Packet sent' : endingSession ? 'Sending…' : allRun ? 'End session & email packet' : 'End early & email what we built'}
        </button>
      </div>
      {packetError ? (
        <p role="alert" style={{ color: 'var(--color-accent)' }}>{packetError}</p>
      ) : null}

      {packetSent ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.push('/counselor/sessions')}
          style={{ alignSelf: 'flex-start' }}
        >
          Back to sessions
        </button>
      ) : null}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function SectionCard({
  step,
  title,
  Icon,
  accent,
  statusBadge,
  children,
}: {
  step: number;
  title: string;
  Icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  accent: string;
  statusBadge: string;
  children: React.ReactNode;
}) {
  return (
    <section className="portal-card portal-card--flat" style={{ padding: '1.25rem 1.5rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <span
          aria-hidden
          style={{
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            color: accent,
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        >
          {step}
        </span>
        <Icon size={20} aria-hidden />
        <h2 style={{ flex: 1, margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
          {title}
        </h2>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.25rem 0.5rem',
            borderRadius: '999px',
            background: 'var(--surface-container)',
            color: 'var(--color-on-surface-variant)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {statusBadge}
        </span>
      </header>
      {children}
    </section>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--color-on-surface-variant)', margin: 0 }}>
        {label}
      </dt>
      <dd style={{ margin: '0.15rem 0 0', fontSize: '0.95rem', color: 'var(--color-on-surface)' }}>{value || '—'}</dd>
    </div>
  );
}

function OutputPanel({ label, body, savedTo }: { label: string; body: string; savedTo: string }) {
  return (
    <div style={{ marginTop: '1rem', background: 'var(--surface-container-low)', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)' }}>
          {label}
        </strong>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-green, #4a9b4f)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <CheckCircle2 size={14} aria-hidden /> Saved to {savedTo.split(' ')[0]}
        </span>
      </header>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.55, margin: 0, color: 'var(--color-on-surface)' }}>
        {body}
      </pre>
    </div>
  );
}

function InterviewOutput({ body, savedTo }: { body: string; savedTo: string }) {
  let questions: Array<{ question: string; type?: string; tip?: string; exampleAnswer?: string; starHint?: string }> = [];
  try {
    questions = JSON.parse(body);
  } catch {
    return <OutputPanel label="Interview questions" body={body} savedTo={savedTo} />;
  }
  return (
    <div style={{ marginTop: '1rem', background: 'var(--surface-container-low)', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)' }}>
          {questions.length} interview questions
        </strong>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-green, #4a9b4f)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <CheckCircle2 size={14} aria-hidden /> Saved to {savedTo.split(' ')[0]}
        </span>
      </header>
      <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {questions.map((q, i) => (
          <li key={i}>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-on-surface)' }}>{q.question}</p>
            {q.tip ? <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}><em>Tip:</em> {q.tip}</p> : null}
            {q.exampleAnswer ? <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}><em>Sample answer:</em> {q.exampleAnswer}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
