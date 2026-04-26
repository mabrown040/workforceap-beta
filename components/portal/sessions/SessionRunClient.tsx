'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, FileText, Keyboard, Loader2, MessagesSquare, Mic, PenLine, Sparkles, Upload, User } from 'lucide-react';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { mockInterviewVoiceSurface, resumeCoachVoiceSurface } from '@/lib/portal/voice';

type ToolKey = 'resume' | 'coverLetter' | 'interview';
type CardVoiceKey = 'walkthrough' | 'resume' | 'cover' | 'interview';

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
  /** Where "Edit full profile" links to. Differs by actor (counselor vs admin). */
  memberDetailHref?: string;
  /** Where "Back to sessions" goes after the packet sends. Differs by actor. */
  sessionsListHref?: string;
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
  memberDetailHref,
  sessionsListHref,
}: Props) {
  // Default to counselor paths so callers that don't pass these (legacy
  // call sites) keep their existing behavior.
  const editProfileHref = memberDetailHref ?? `/counselor/students/${memberId}`;
  const backToSessionsHref = sessionsListHref ?? '/counselor/sessions';
  const router = useRouter();

  // Per-tool state
  const [linkedinHlState, setLinkedinHlState] = useState<ToolState>(initialToolState);
  const [linkedinAboutState, setLinkedinAboutState] = useState<ToolState>(initialToolState);
  const [jobMatchState, setJobMatchState] = useState<ToolState>(initialToolState);
  const [salaryState, setSalaryState] = useState<ToolState>(initialToolState);
  const [resumeState, setResumeState] = useState<ToolState>(initialToolState);
  const [coverState, setCoverState] = useState<ToolState>(initialToolState);
  const [interviewState, setInterviewState] = useState<ToolState>(initialToolState);

  // Per-tool inputs
  const [linkedinSkills, setLinkedinSkills] = useState('');
  const [linkedinYears, setLinkedinYears] = useState('');
  const [linkedinBullets, setLinkedinBullets] = useState('');
  const [salaryOffer, setSalaryOffer] = useState('');
  const [salaryTarget, setSalaryTarget] = useState('');
  const [salaryDelivery, setSalaryDelivery] = useState<'email' | 'phone'>('email');
  const [elevatorStrengths, setElevatorStrengths] = useState('');
  const [elevatorIndustry, setElevatorIndustry] = useState('');
  const [resumeText, setResumeText] = useState(existingResume);
  const [jobTarget, setJobTarget] = useState(memberTargetRole ?? '');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [interviewLevel, setInterviewLevel] = useState<'entry' | 'mid' | 'senior'>('entry');

  // Resume upload state
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadResumeError, setUploadResumeError] = useState<string | null>(null);

  // Wrap-up state
  const [endingSession, setEndingSession] = useState(false);
  const [packetSent, setPacketSent] = useState(false);
  const [packetError, setPacketError] = useState<string | null>(null);


  // Per-card voice state. Each card (walkthrough, resume, cover,
  // interview) can be toggled into voice mode independently. The active
  // card's transcript routes to its own bucket so transcripts don't bleed
  // across cards. Walkthrough is the only one open by default — the
  // others open inline when the counselor clicks "Use voice".
  const [activeVoiceCard, setActiveVoiceCard] = useState<CardVoiceKey | null>('walkthrough');
  const [transcripts, setTranscripts] = useState<Record<CardVoiceKey, string[]>>({
    walkthrough: [],
    resume: [],
    cover: [],
    interview: [],
  });
  const [voiceComplete, setVoiceComplete] = useState<Record<CardVoiceKey, boolean>>({
    walkthrough: false,
    resume: false,
    cover: false,
    interview: false,
  });

  const makeTranscriptHandler = (card: CardVoiceKey) =>
    (chunk: { speaker: 'agent' | 'user'; text: string }) => {
      setTranscripts((prev) => ({
        ...prev,
        [card]: [...prev[card], `${chunk.speaker === 'user' ? 'Member' : 'Coach'}: ${chunk.text}`],
      }));
    };
  const makePhaseHandler = (card: CardVoiceKey) =>
    (phase: string) => {
      if (phase === 'done') setVoiceComplete((prev) => ({ ...prev, [card]: true }));
    };

  const walkthroughTranscript = transcripts.walkthrough;
  const walkthroughText = walkthroughTranscript.join('\n');

  const useTranscriptAsResume = useCallback((card: CardVoiceKey = 'walkthrough') => {
    const lines = transcripts[card];
    if (lines.length === 0) return;
    const memberOnly = lines
      .filter((line) => line.startsWith('Member:'))
      .map((line) => line.replace(/^Member: /, ''))
      .join('\n');
    if (memberOnly.trim().length > 0) {
      setResumeText(memberOnly);
    }
  }, [transcripts]);

  const useTranscriptAsCoverContext = useCallback(() => {
    const lines = transcripts.cover;
    if (lines.length === 0) return;
    const memberOnly = lines
      .filter((line) => line.startsWith('Member:'))
      .map((line) => line.replace(/^Member: /, ''))
      .join('\n');
    setJobDescription((prev) => (prev.trim().length > 0 ? prev : memberOnly || lines.join('\n')));
  }, [transcripts.cover]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingResume(true);
    setUploadResumeError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('memberId', memberId);
    try {
      const res = await fetch('/api/counselor/sessions/upload-resume', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadResumeError(data.error ?? 'Upload failed');
      } else if (data.text) {
        setResumeText(data.text);
      }
    } catch {
      setUploadResumeError('Network error uploading file');
    } finally {
      setUploadingResume(false);
    }
  };

  const toggleVoice = (card: CardVoiceKey) => {
    setActiveVoiceCard((prev) => (prev === card ? null : card));
  };

  // Memoized payloads for each card's voice session — threading prior
  // outputs forward so each agent picks up where the last one left off.
  const walkthroughPayload = useMemo(() => ({
    memberId,
    sessionId,
    card: 'walkthrough' as const,
  }), [memberId, sessionId]);

  const resumeVoicePayload = useMemo(() => ({
    memberId,
    sessionId,
    card: 'resume' as const,
    resumeDraft: resumeText,
    jobTarget,
  }), [memberId, sessionId, resumeText, jobTarget]);

  const coverVoicePayload = useMemo(() => ({
    memberId,
    sessionId,
    card: 'cover' as const,
    resumeDraft: resumeState.output ?? resumeText,
    jobTarget,
    jobDescription,
    companyName,
  }), [memberId, sessionId, resumeState.output, resumeText, jobTarget, jobDescription, companyName]);

  const interviewVoicePayload = useMemo(() => ({
    memberId,
    sessionId,
    card: 'interview' as const,
    resumeDraft: resumeState.output ?? resumeText,
    coverDraft: coverState.output ?? '',
    jobTarget,
    interviewLevel,
  }), [memberId, sessionId, resumeState.output, coverState.output, resumeText, jobTarget, interviewLevel]);

  const hasAnyOutput = !!(salaryState.output || jobMatchState.output || linkedinHlState.output || linkedinAboutState.output || elevatorState.output || resumeState.output || coverState.output || interviewState.output);
  const allRun = !!(salaryState.output && jobMatchState.output && linkedinHlState.output && linkedinAboutState.output && elevatorState.output && resumeState.output && coverState.output && interviewState.output);


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

  
  
  
  const runJobMatch = () =>
    runTool(
      'job_match_scorer' as any,
      setJobMatchState,
      '/api/ai/job-match-scorer',
      { resume: resumeText, jobDescription, targetRole: jobTarget },
      jobTarget || 'Job Match Scorer',
      (d) => (d as any).analysis || (d as any).output || '',
    );

  const runSalary = () =>
    runTool(
      'salary_negotiation' as any,
      setSalaryState,
      '/api/ai/salary-negotiation',
      { currentOffer: salaryOffer, targetSalary: salaryTarget, jobTitle: jobTarget, companyName: companyName || 'Company', deliveryMethod: salaryDelivery },
      jobTarget || 'Salary Negotiation',
      (d) => (d as any).script || (d as any).output || '',
    );

const runLinkedinHl = () =>
    runTool(
      'linkedin_headline' as any,
      setLinkedinHlState,
      '/api/ai/linkedin-headline',
      { role: jobTarget, keySkills: linkedinSkills, yearsExperience: linkedinYears },
      jobTarget || 'LinkedIn Headline',
      (d) => JSON.stringify((d as any).headlines || []),
    );

  const runLinkedinAbout = () =>
    runTool(
      'linkedin_about' as any,
      setLinkedinAboutState,
      '/api/ai/linkedin-about',
      { role: jobTarget, bullets: linkedinBullets },
      jobTarget || 'LinkedIn About',
      (d) => (d as any).about || (d as any).output || '',
    );
const runElevator = () =>
    runTool(
      'elevator_pitch' as any,
      setElevatorState,
      '/api/ai/elevator-pitch',
      { name: memberFullName.split(' ')[0], targetRole: jobTarget, strengths: elevatorStrengths, industry: elevatorIndustry },
      jobTarget || 'Elevator Pitch',
      (d) => (d as any).pitch || (d as any).output || '',
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

      {/* ── Voice walk-through (primary path, optional) ──
          Per user direction (2026-04-26): "we want these to be all voice
          tools here." Per follow-up (2026-04-27): "each step is separate
          card. filling out as you go along. and all feeding to each other
          right." So this top card stays as the optional A→Z walk-through
          (one big conversation), and each card below also gets its own
          step-specific voice option. */}
      <SectionCard
        step={0}
        title="Voice walk-through (full A→Z)"
        Icon={Mic}
        accent="#2563eb"
        statusBadge={
          voiceComplete.walkthrough
            ? 'Recorded'
            : walkthroughTranscript.length > 0
            ? 'Live'
            : activeVoiceCard === 'walkthrough'
            ? 'Ready'
            : 'Optional'
        }
        headerAction={
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => toggleVoice('walkthrough')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {activeVoiceCard === 'walkthrough' ? <Keyboard size={14} aria-hidden /> : <Mic size={14} aria-hidden />}
            {activeVoiceCard === 'walkthrough' ? 'Hide voice' : 'Use voice'}
          </button>
        }
      >
        <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
          One long conversation that walks {memberFullName.split(' ')[0]} through profile, work history,
          target role, and interview prep — or skip this and use voice on each card below as you go.
        </p>
        {activeVoiceCard === 'walkthrough' ? (
          <VoiceAgentSurface {...resumeCoachVoiceSurface}>
            <PortalVoiceSession
              sessionEndpoint="/api/counselor/sessions/voice-walkthrough"
              sessionPayload={walkthroughPayload}
              title={`Build ${memberFullName.split(' ')[0]}'s session out loud`}
              titleAs="h3"
              description="Resume coach + cover letter + interview prep, all in one voice session."
              accent="#2563eb"
              accentDark="#1e40af"
              speakingLabel="Coach is speaking…"
              listeningLabel="Listening — answer out loud"
              onTranscriptChunk={makeTranscriptHandler('walkthrough')}
              onPhaseChange={makePhaseHandler('walkthrough')}
              showLiveTranscript
              liveTranscriptCoachLabel="Coach"
              liveTranscriptYouLabel={memberFullName.split(' ')[0]}
              retryWithoutDynamicVariables={false}
            />
          </VoiceAgentSurface>
        ) : null}
        {walkthroughTranscript.length > 0 ? (
          <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                {walkthroughTranscript.length} transcript line{walkthroughTranscript.length === 1 ? '' : 's'} captured
              </p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                Use as the resume input below, then refine + click &ldquo;Build resume.&rdquo;
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => useTranscriptAsResume('walkthrough')}
              disabled={walkthroughText.length < 30}
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
            href={editProfileHref}
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

      
      {/* Card 2: Elevator Pitch */}
      <SectionCard
        step={2}
        title="Elevator Pitch"
        Icon={MessagesSquare}
        accent="var(--color-gold, #a47f38)"
        statusBadge={
          elevatorState.status === 'running' ? 'Running' :
          elevatorState.output ? 'Done' :
          elevatorState.error ? 'Failed' :
          'Ready'
        }
      >
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-job-target-ep">
            Target role <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <input
            id="session-job-target-ep"
            type="text"
            value={jobTarget}
            onChange={(e) => setJobTarget(e.target.value)}
            placeholder="IT Support Specialist"
            disabled={elevatorState.status === 'running'}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-elevator-strengths">Key strengths / traits</label>
          <input
            id="session-elevator-strengths"
            type="text"
            value={elevatorStrengths}
            onChange={(e) => setElevatorStrengths(e.target.value)}
            placeholder="Problem solver, calm under pressure, quick learner"
            disabled={elevatorState.status === 'running'}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-elevator-industry">Target Industry</label>
          <input
            id="session-elevator-industry"
            type="text"
            value={elevatorIndustry}
            onChange={(e) => setElevatorIndustry(e.target.value)}
            placeholder="Healthcare IT, Enterprise SaaS, etc."
            disabled={elevatorState.status === 'running'}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-small"
          onClick={runElevator}
          disabled={elevatorState.status === 'running' || !jobTarget.trim()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          {elevatorState.status === 'running' ? (
            <Loader2 size={16} className="ai-tool-submit-spinner" aria-hidden />
          ) : (
            <Sparkles size={16} aria-hidden />
          )}
          {elevatorState.status === 'running' ? 'Generating…' : elevatorState.output ? 'Re-run' : 'Build pitch'}
        </button>
        {elevatorState.error ? (
          <p role="alert" style={{ color: 'var(--color-accent)', marginTop: '0.5rem' }}>{elevatorState.error}</p>
        ) : null}
        {elevatorState.output ? (
          <OutputPanel label="Elevator Pitch" body={elevatorState.output} savedTo={memberFullName} />
        ) : null}
      </SectionCard>
{/* Card 3: Resume rewriter */}
      <SectionCard
        step={3}
        title="Resume rewriter"
        Icon={FileText}
        accent="var(--color-accent)"
        statusBadge={
          resumeState.status === 'running' ? 'Running' :
          resumeState.output ? 'Done' :
          resumeState.error ? 'Failed' :
          activeVoiceCard === 'resume' ? 'Voice' :
          'Ready'
        }
        headerAction={
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => toggleVoice('resume')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {activeVoiceCard === 'resume' ? <Keyboard size={14} aria-hidden /> : <Mic size={14} aria-hidden />}
            {activeVoiceCard === 'resume' ? 'Hide voice' : 'Use voice'}
          </button>
        }
      >
        {activeVoiceCard === 'resume' ? (
          <div style={{ marginBottom: '1rem' }}>
            <VoiceAgentSurface {...resumeCoachVoiceSurface}>
              <PortalVoiceSession
                sessionEndpoint="/api/counselor/sessions/voice-walkthrough"
                sessionPayload={resumeVoicePayload}
                title="Resume coach"
                titleAs="h3"
                description="Talk through experience, certifications, and framing for the target role."
                accent="#2563eb"
                accentDark="#1e40af"
                speakingLabel="Coach is speaking…"
                listeningLabel="Listening — answer out loud"
                onTranscriptChunk={makeTranscriptHandler('resume')}
                onPhaseChange={makePhaseHandler('resume')}
                showLiveTranscript
                liveTranscriptCoachLabel="Coach"
                liveTranscriptYouLabel={memberFullName.split(' ')[0]}
                retryWithoutDynamicVariables={false}
              />
            </VoiceAgentSurface>
            {transcripts.resume.length > 0 ? (
              <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                  {transcripts.resume.length} transcript line{transcripts.resume.length === 1 ? '' : 's'} captured
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => useTranscriptAsResume('resume')}
                  disabled={transcripts.resume.join('\n').length < 30}
                >
                  Pre-fill resume input &darr;
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <label htmlFor="session-resume-text" style={{ margin: 0 }}>
              Resume / experience <span style={{ color: 'var(--color-accent)' }}>*</span>
            </label>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: uploadingResume || resumeState.status === 'running' ? 'not-allowed' : 'pointer',
                opacity: uploadingResume || resumeState.status === 'running' ? 0.5 : 1,
                color: 'var(--color-on-surface-variant)',
              }}
            >
              {uploadingResume
                ? <Loader2 size={14} className="ai-tool-submit-spinner" aria-hidden />
                : <Upload size={14} aria-hidden />}
              {uploadingResume ? 'Uploading…' : 'Upload file'}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                style={{ display: 'none' }}
                disabled={uploadingResume || resumeState.status === 'running'}
                onChange={handleResumeUpload}
              />
            </label>
          </div>
          {uploadResumeError ? (
            <p role="alert" style={{ margin: '0 0 0.35rem', fontSize: '0.8125rem', color: 'var(--color-accent)' }}>{uploadResumeError}</p>
          ) : null}
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

      {/* Card 4: Cover letter */}
      <SectionCard
        step={4}
        title="Cover letter"
        Icon={MessagesSquare}
        accent="var(--color-gold, #a47f38)"
        statusBadge={
          coverState.status === 'running' ? 'Running' :
          coverState.output ? 'Done' :
          coverState.error ? 'Failed' :
          activeVoiceCard === 'cover' ? 'Voice' :
          'Ready'
        }
        contextNote={
          resumeState.output
            ? `Using resume from step 2 as context.`
            : resumeText.trim().length > 50
            ? 'Will use the resume input from step 2 as context.'
            : null
        }
        headerAction={
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => toggleVoice('cover')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {activeVoiceCard === 'cover' ? <Keyboard size={14} aria-hidden /> : <Mic size={14} aria-hidden />}
            {activeVoiceCard === 'cover' ? 'Hide voice' : 'Use voice'}
          </button>
        }
      >
        {activeVoiceCard === 'cover' ? (
          <div style={{ marginBottom: '1rem' }}>
            <VoiceAgentSurface {...resumeCoachVoiceSurface}>
              <PortalVoiceSession
                sessionEndpoint="/api/counselor/sessions/voice-walkthrough"
                sessionPayload={coverVoicePayload}
                title="Cover letter coach"
                titleAs="h3"
                description="Read or paraphrase the job posting out loud — coach helps frame the cover."
                accent="#2563eb"
                accentDark="#1e40af"
                speakingLabel="Coach is speaking…"
                listeningLabel="Listening — describe the role"
                onTranscriptChunk={makeTranscriptHandler('cover')}
                onPhaseChange={makePhaseHandler('cover')}
                showLiveTranscript
                liveTranscriptCoachLabel="Coach"
                liveTranscriptYouLabel={memberFullName.split(' ')[0]}
                retryWithoutDynamicVariables={false}
              />
            </VoiceAgentSurface>
            {transcripts.cover.length > 0 ? (
              <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                  {transcripts.cover.length} transcript line{transcripts.cover.length === 1 ? '' : 's'} captured
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={useTranscriptAsCoverContext}
                  disabled={transcripts.cover.join('\n').length < 30}
                >
                  Pre-fill job description &darr;
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
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

      {/* Card 5: Interview prep */}
      <SectionCard
        step={5}
        title="Interview prep"
        Icon={MessagesSquare}
        accent="#2b7bb9"
        statusBadge={
          interviewState.status === 'running' ? 'Running' :
          interviewState.output ? 'Done' :
          interviewState.error ? 'Failed' :
          activeVoiceCard === 'interview' ? 'Voice' :
          'Ready'
        }
        contextNote={
          resumeState.output && coverState.output
            ? 'Using resume + cover letter from steps 2 & 3 as context.'
            : resumeState.output
            ? 'Using resume from step 2 as context.'
            : null
        }
        headerAction={
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => toggleVoice('interview')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {activeVoiceCard === 'interview' ? <Keyboard size={14} aria-hidden /> : <Mic size={14} aria-hidden />}
            {activeVoiceCard === 'interview' ? 'Hide voice' : 'Use voice'}
          </button>
        }
      >
        {activeVoiceCard === 'interview' ? (
          <div style={{ marginBottom: '1rem' }}>
            <VoiceAgentSurface {...mockInterviewVoiceSurface}>
              <PortalVoiceSession
                sessionEndpoint="/api/counselor/sessions/voice-walkthrough"
                sessionPayload={interviewVoicePayload}
                title="Mock interview"
                titleAs="h3"
                description={`Practice ${jobTarget || 'role-fit'} questions out loud. Coach references the resume + cover letter.`}
                accent="#7c3aed"
                accentDark="#5b21b6"
                speakingLabel="Interviewer is asking…"
                listeningLabel="Listening — answer out loud"
                onTranscriptChunk={makeTranscriptHandler('interview')}
                onPhaseChange={makePhaseHandler('interview')}
                showLiveTranscript
                liveTranscriptCoachLabel="Interviewer"
                liveTranscriptYouLabel={memberFullName.split(' ')[0]}
                retryWithoutDynamicVariables={false}
              />
            </VoiceAgentSurface>
          </div>
        ) : null}
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
          onClick={() => router.push(backToSessionsHref)}
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
  headerAction,
  contextNote,
  children,
}: {
  step: number;
  title: string;
  Icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  accent: string;
  statusBadge: string;
  headerAction?: React.ReactNode;
  contextNote?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="portal-card portal-card--flat" style={{ padding: '1.25rem 1.5rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: contextNote ? '0.5rem' : '1rem', flexWrap: 'wrap' }}>
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
        {headerAction ? <div>{headerAction}</div> : null}
      </header>
      {contextNote ? (
        <p
          style={{
            margin: '0 0 1rem',
            padding: '0.4rem 0.65rem',
            background: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
            borderLeft: '3px solid var(--color-accent)',
            borderRadius: '0.35rem',
            fontSize: '0.8rem',
            color: 'var(--color-on-surface-variant)',
          }}
        >
          {contextNote}
        </p>
      ) : null}
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

      {/* Card 6: Job Match Scorer */}
      <SectionCard
        step={6}
        title="Job Match Scorer"
        Icon={FileText}
        accent="#8b5cf6"
        statusBadge={jobMatchState.status === 'running' ? 'Running' : jobMatchState.output ? 'Done' : jobMatchState.error ? 'Failed' : 'Ready'}
      >
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>Compare their resume against the job description to find missing keywords and gaps. Uses the Resume and Job Description fields from above.</p>
        <button type="button" className="btn btn-primary btn-small" onClick={runJobMatch} disabled={jobMatchState.status === 'running' || !jobDescription.trim() || resumeText.trim().length < 50} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#8b5cf6', borderColor: '#8b5cf6' }}>
          {jobMatchState.status === 'running' ? <Loader2 size={16} className="ai-tool-submit-spinner" aria-hidden /> : <Sparkles size={16} aria-hidden />}
          {jobMatchState.status === 'running' ? 'Scoring…' : jobMatchState.output ? 'Re-run Match' : 'Score Match'}
        </button>
        {jobMatchState.error ? <p role="alert" style={{ color: 'var(--color-accent)', marginTop: '0.5rem' }}>{jobMatchState.error}</p> : null}
        {jobMatchState.output ? <OutputPanel label="Job Match Analysis" body={jobMatchState.output} savedTo={memberFullName} /> : null}
      </SectionCard>

      {/* Card 7: Salary Negotiation */}
      <SectionCard
        step={7}
        title="Salary Negotiation Script"
        Icon={MessagesSquare}
        accent="#10b981"
        statusBadge={salaryState.status === 'running' ? 'Running' : salaryState.output ? 'Done' : salaryState.error ? 'Failed' : 'Ready'}
      >
        <div className="form-group" style={{ marginBottom: '0.75rem' }}><label htmlFor="session-salary-offer">Current Offer</label><input id="session-salary-offer" type="text" value={salaryOffer} onChange={(e) => setSalaryOffer(e.target.value)} placeholder="e.g. $65,000" disabled={salaryState.status === 'running'} /></div>
        <div className="form-group" style={{ marginBottom: '0.75rem' }}><label htmlFor="session-salary-target">Target Salary</label><input id="session-salary-target" type="text" value={salaryTarget} onChange={(e) => setSalaryTarget(e.target.value)} placeholder="e.g. $75,000" disabled={salaryState.status === 'running'} /></div>
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-salary-delivery">Delivery Method</label>
          <select id="session-salary-delivery" value={salaryDelivery} onChange={(e) => setSalaryDelivery(e.target.value as 'email' | 'phone')} disabled={salaryState.status === 'running'} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
            <option value="email">Email</option><option value="phone">Phone</option>
          </select>
        </div>
        <button type="button" className="btn btn-primary btn-small" onClick={runSalary} disabled={salaryState.status === 'running' || !salaryOffer.trim() || !salaryTarget.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#10b981', borderColor: '#10b981' }}>
          {salaryState.status === 'running' ? <Loader2 size={16} className="ai-tool-submit-spinner" aria-hidden /> : <Sparkles size={16} aria-hidden />}
          {salaryState.status === 'running' ? 'Generating…' : salaryState.output ? 'Re-run' : 'Build Script'}
        </button>
        {salaryState.error ? <p role="alert" style={{ color: 'var(--color-accent)', marginTop: '0.5rem' }}>{salaryState.error}</p> : null}
        {salaryState.output ? <OutputPanel label="Negotiation Script" body={salaryState.output} savedTo={memberFullName} /> : null}
      </SectionCard>

            {/* Card 8: LinkedIn Headline */}
      <SectionCard
        step={8}
        title="LinkedIn Headline"
        Icon={MessagesSquare}
        accent="#0077b5"
        statusBadge={
          linkedinHlState.status === 'running' ? 'Running' :
          linkedinHlState.output ? 'Done' :
          linkedinHlState.error ? 'Failed' :
          'Ready'
        }
      >
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-job-target-lnh">
            Target role <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <input
            id="session-job-target-lnh"
            type="text"
            value={jobTarget}
            onChange={(e) => setJobTarget(e.target.value)}
            placeholder="IT Support Specialist"
            disabled={linkedinHlState.status === 'running'}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-linkedin-skills">
            Key Skills <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <input
            id="session-linkedin-skills"
            type="text"
            value={linkedinSkills}
            onChange={(e) => setLinkedinSkills(e.target.value)}
            placeholder="Networking, Windows Server, Active Directory"
            disabled={linkedinHlState.status === 'running'}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-linkedin-years">Years of Experience</label>
          <input
            id="session-linkedin-years"
            type="text"
            value={linkedinYears}
            onChange={(e) => setLinkedinYears(e.target.value)}
            placeholder="e.g. 3 years"
            disabled={linkedinHlState.status === 'running'}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-small"
          onClick={runLinkedinHl}
          disabled={linkedinHlState.status === 'running' || !jobTarget.trim() || !linkedinSkills.trim()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#0077b5', borderColor: '#0077b5' }}
        >
          {linkedinHlState.status === 'running' ? (
            <Loader2 size={16} className="ai-tool-submit-spinner" aria-hidden />
          ) : (
            <Sparkles size={16} aria-hidden />
          )}
          {linkedinHlState.status === 'running' ? 'Generating…' : linkedinHlState.output ? 'Re-run' : 'Build Headlines'}
        </button>
        {linkedinHlState.error ? (
          <p role="alert" style={{ color: 'var(--color-accent)', marginTop: '0.5rem' }}>{linkedinHlState.error}</p>
        ) : null}
        {linkedinHlState.output ? (
          <OutputPanel label="LinkedIn Headlines" body={JSON.parse(linkedinHlState.output).map((h: string, i: number) => `${i+1}. ${h}`).join('\n\n')} savedTo={memberFullName} />
        ) : null}
      </SectionCard>

      {/* Card 7: LinkedIn About */}
      <SectionCard
        step={9}
        title="LinkedIn About Section"
        Icon={FileText}
        accent="#0077b5"
        statusBadge={
          linkedinAboutState.status === 'running' ? 'Running' :
          linkedinAboutState.output ? 'Done' :
          linkedinAboutState.error ? 'Failed' :
          'Ready'
        }
      >
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-job-target-lna">
            Target role <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <input
            id="session-job-target-lna"
            type="text"
            value={jobTarget}
            onChange={(e) => setJobTarget(e.target.value)}
            placeholder="IT Support Specialist"
            disabled={linkedinAboutState.status === 'running'}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-linkedin-bullets">
            Key details & highlights <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <textarea
            id="session-linkedin-bullets"
            value={linkedinBullets}
            onChange={(e) => setLinkedinBullets(e.target.value)}
            rows={4}
            placeholder="Provide a few bullet points about what they do best and their main career objective..."
            disabled={linkedinAboutState.status === 'running'}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-small"
          onClick={runLinkedinAbout}
          disabled={linkedinAboutState.status === 'running' || !jobTarget.trim() || !linkedinBullets.trim()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#0077b5', borderColor: '#0077b5' }}
        >
          {linkedinAboutState.status === 'running' ? (
            <Loader2 size={16} className="ai-tool-submit-spinner" aria-hidden />
          ) : (
            <Sparkles size={16} aria-hidden />
          )}
          {linkedinAboutState.status === 'running' ? 'Generating…' : linkedinAboutState.output ? 'Re-run' : 'Build About Section'}
        </button>
        {linkedinAboutState.error ? (
          <p role="alert" style={{ color: 'var(--color-accent)', marginTop: '0.5rem' }}>{linkedinAboutState.error}</p>
        ) : null}
        {linkedinAboutState.output ? (
          <OutputPanel label="LinkedIn About Section" body={linkedinAboutState.output} savedTo={memberFullName} />
        ) : null}
      </SectionCard>

