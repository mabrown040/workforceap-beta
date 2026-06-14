'use client';

import { useState, useEffect, useRef } from 'react';
import type { Conversation } from '@elevenlabs/client';
import {
  appendVoiceTranscriptTurn,
  buildInterviewQaFromVoiceTurns,
  extractVoiceTranscriptTurn,
  type VoiceTranscriptTurn,
} from '@/lib/interview/voiceTranscript';
import ToolFollowThrough from './ToolFollowThrough';

type TranscriptEntry = { question: string; answer: string };
type Phase = 'setup' | 'voice' | 'interview' | 'feedback';

interface InterviewSession {
  id: string;
  createdAt: string;
  role: string;
  interviewType: string;
  feedback: string;
  questions: string[];
  answers: string[];
  sessionId: string;
  transcriptTurns?: VoiceTranscriptTurn[];
}

const INTERVIEW_TYPES = ['Behavioral', 'Technical', 'General'];
const MAX_QUESTIONS = 5;

export default function InterviewCoach() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [role, setRole] = useState('');
  const [interviewType, setInterviewType] = useState('Behavioral');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'voice' | 'text'>('text');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [feedback, setFeedback] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [signedUrl, setSignedUrl] = useState('');
  const [wsStatus, setWsStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [micDenied, setMicDenied] = useState(false);
  const [micStatus, setMicStatus] = useState<'idle'|'requesting'|'granted'|'denied'>('idle');
  const [voiceError, setVoiceError] = useState<string>('');
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const convRef = useRef<Conversation | null>(null);
  const intentionalCloseRef = useRef(false);
  const voiceTranscriptRef = useRef<VoiceTranscriptTurn[]>([]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (convRef.current) convRef.current.endSession();
    };
  }, []);

  // Fetch past sessions on mount
  useEffect(() => {
    setSessionsLoading(true);
    fetch('/api/interview/history?limit=5')
      .then(r => r.json())
      .then((data: { sessions?: InterviewSession[] }) => {
        setSessions(data.sessions ?? []);
      })
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, []);

  function refreshSessions() {
    fetch('/api/interview/history?limit=5')
      .then(r => r.json())
      .then((data: { sessions?: InterviewSession[] }) => {
        setSessions(data.sessions ?? []);
      })
      .catch(() => {});
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  async function startInterview() {
    if (!role.trim()) return;
    setLoading(true);
    try {
      // Request mic permission before ElevenLabs session
      let micGranted = false;
      setMicStatus('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        micGranted = true;
        setMicStatus('granted');
      } catch {
        setMicDenied(true);
        setMicStatus('denied');
      }

      const res = await fetch('/api/interview/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, interviewType: interviewType.toLowerCase(), forceText: !micGranted }),
      });
      const data = await res.json() as {
        mode: 'voice' | 'text';
        signedUrl?: string;
        firstQuestion?: string;
        sessionId: string;
      };

      setMode(data.mode);
      setSessionId(data.sessionId);

      if (micGranted && data.mode === 'voice' && data.signedUrl) {
        setSignedUrl(data.signedUrl);
        voiceTranscriptRef.current = [];
        setPhase('voice');
        connectVoiceSession(data.signedUrl);
      } else {
        setCurrentQuestion(data.firstQuestion ?? '');
        setPhase('interview');
      }
    } finally {
      setLoading(false);
    }
  }

  async function connectVoiceSession(url: string) {
    setVoiceError('');
    setWsStatus('connecting');
    try {
      const { Conversation } = await import('@elevenlabs/client');
      const conv = await Conversation.startSession({
        signedUrl: url,
        onConnect: () => setWsStatus('connected'),
        onDisconnect: (details) => {
          setWsStatus('ended');
          if (!intentionalCloseRef.current) {
            if (details?.reason === 'error') {
              setVoiceError(details.message || 'Connection lost');
            }
            getVoiceFeedback();
          }
          intentionalCloseRef.current = false;
        },
        onMessage: (event) => {
          voiceTranscriptRef.current = appendVoiceTranscriptTurn(
            voiceTranscriptRef.current,
            extractVoiceTranscriptTurn(event)
          );
        },
        onError: (msg) => { setWsStatus('ended'); setVoiceError(String(msg) || 'Connection error'); },
      });
      convRef.current = conv;
    } catch (e) {
      setWsStatus('ended');
      setVoiceError(String(e));
    }
  }

  async function getVoiceFeedback() {
    const turns = voiceTranscriptRef.current;
    const { questions, answers } = buildInterviewQaFromVoiceTurns(turns);

    if (answers.length === 0) {
      setFeedback('Your voice interview session has ended but no responses were captured. Please ensure your microphone is working and try again.');
      setPhase('feedback');
      return;
    }

    setLoading(true);
    setPhase('feedback');
    try {
      const sid = sessionId || `fallback-${Date.now()}`;
      const res = await fetch('/api/interview/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          role,
          interviewType: interviewType.toLowerCase(),
          questions,
          answers,
          transcriptTurns: turns,
        }),
      });
      const data = await res.json() as { feedback?: string; error?: string };
      setFeedback(data.feedback ?? data.error ?? 'Unable to generate feedback.');
      refreshSessions();
    } catch {
      setFeedback('Failed to generate feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function startTextFallback() {
    const res = await fetch('/api/interview/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, interviewType: interviewType.toLowerCase(), forceText: true }),
    });
    const data = await res.json() as { firstQuestion?: string; sessionId?: string };
    if (data.sessionId) setSessionId(data.sessionId);
    setCurrentQuestion(data.firstQuestion ?? `Tell me about yourself and your interest in the ${role} role.`);
    setPhase('interview');
  }

  async function submitAnswer() {
    if (!currentAnswer.trim()) return;
    const newEntry: TranscriptEntry = { question: currentQuestion, answer: currentAnswer };
    const newTranscript = [...transcript, newEntry];
    setTranscript(newTranscript);
    setCurrentAnswer('');

    if (newTranscript.length >= MAX_QUESTIONS) {
      await getFeedback(newTranscript);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/interview/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, interviewType: interviewType.toLowerCase(), transcript: newTranscript, nextQuestion: true }),
      });
      const data = await res.json() as { firstQuestion: string };
      setCurrentQuestion(data.firstQuestion);
    } finally {
      setLoading(false);
    }
  }

  async function getFeedback(t: TranscriptEntry[]) {
    setLoading(true);
    try {
      const sid = sessionId || `fallback-${Date.now()}`;
      const res = await fetch('/api/interview/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          role,
          interviewType: interviewType.toLowerCase(),
          questions: t.map(entry => entry.question),
          answers: t.map(entry => entry.answer),
        }),
      });
      const data = await res.json() as { feedback?: string; error?: string };
      setFeedback(data.feedback ?? data.error ?? 'Unable to generate feedback.');
      setPhase('feedback');
      refreshSessions();
    } finally {
      setLoading(false);
    }
  }

  function endVoiceSession() {
    // Let onDisconnect handle feedback generation
    if (convRef.current) convRef.current.endSession();
  }

  function reset() {
    intentionalCloseRef.current = true;
    setPhase('setup');
    setRole('');
    setInterviewType('Behavioral');
    setCurrentQuestion('');
    setCurrentAnswer('');
    setTranscript([]);
    setFeedback('');
    setSessionId('');
    setSignedUrl('');
    setWsStatus('idle');
    setMode('text');
    voiceTranscriptRef.current = [];
    if (convRef.current) convRef.current.endSession();
  }

  // ── Past Sessions ─────────────────────────────────────────────────────────
  const pastSessionsSection = sessions.length > 0 || sessionsLoading ? (
    <div style={{ marginTop: '2rem', maxWidth: 700 }}>
      <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>
        Past Interview Sessions
      </h3>
      {sessionsLoading ? (
        <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>Loading…</div>
      ) : (
        <>
          {sessions.map(s => {
            const isExpanded = expandedSession === s.id;
            return (
              <div key={s.id} style={{ border: '1px solid var(--surface-container-high)', borderRadius: 8, marginBottom: '0.625rem', overflow: 'hidden' }}>
                <button type="button"
                  onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`interview-coach-session-${s.id}`}
                  style={{ width: '100%', textAlign: 'left', padding: '0.875rem 1rem', background: 'var(--surface-container-low)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>📅 {formatDate(s.createdAt)}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-on-surface)' }}>
                    {s.role} · {s.interviewType.charAt(0).toUpperCase() + s.interviewType.slice(1)}
                  </div>
                  {!isExpanded && s.feedback && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>
                      "{s.feedback.slice(0, 100)}{s.feedback.length > 100 ? '…' : ''}"
                    </div>
                  )}
                </button>
                {isExpanded && (
                  <div id={`interview-coach-session-${s.id}`} style={{ padding: '1rem', background: 'var(--color-surface)', borderTop: '1px solid var(--surface-container-high)' }}>
                    {s.feedback && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Assessment</div>
                        <div style={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--color-on-surface)' }}>{s.feedback}</div>
                      </div>
                    )}
                    {s.questions.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interview Q&A</div>
                        {s.questions.map((q, i) => (
                          <div key={i} style={{ marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.2rem' }}>Q{i + 1}: {q}</div>
                            {s.answers[i] && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', paddingLeft: '0.75rem', borderLeft: '2px solid var(--surface-container-high)' }}>A{i + 1}: {s.answers[i]}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="button"
                      onClick={() => { setExpandedSession(null); reset(); }}
                      style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Start new session →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {sessions.length >= 5 && (
            <a href="/dashboard/ai-tools/history" style={{ fontSize: '0.85rem', color: 'var(--color-accent)', textDecoration: 'none', display: 'inline-block', marginTop: '0.25rem' }}>
              View all past sessions →
            </a>
          )}
        </>
      )}
    </div>
  ) : null;

  // ── Setup ────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="interviewcoach-target-role-field" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--color-on-surface)' }}>
            Target Role *
          </label>
          <input id="interviewcoach-target-role-field"
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Software Engineer, Project Manager, Data Analyst"
            style={{ width: '100%', border: '1px solid var(--surface-container-high)', borderRadius: 8, padding: '0.625rem 0.875rem', fontSize: '0.9rem', background: 'var(--color-surface)', color: 'var(--color-on-surface)', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--color-on-surface)' }}>
            Interview Type
          </label>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            {INTERVIEW_TYPES.map((t) => (
              <button type="button" key={t} onClick={() => setInterviewType(t)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1.5px solid var(--color-accent)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', background: interviewType === t ? 'var(--color-accent)' : 'transparent', color: interviewType === t ? '#fff' : 'var(--color-accent)' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={startInterview} disabled={loading || !role.trim()} style={{ background: 'var(--color-accent)', color: '#fff', border: 0, borderRadius: 8, padding: '0.875rem 2rem', fontWeight: 700, fontSize: '1rem', cursor: loading || !role.trim() ? 'not-allowed' : 'pointer', opacity: loading || !role.trim() ? 0.6 : 1 }}>
          {loading ? 'Starting…' : '▶ Start Interview'}
        </button>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
          Voice-powered by ElevenLabs when available. Text fallback always active.
        </p>
        {pastSessionsSection}
      </div>
    );
  }

  // ── Voice session ────────────────────────────────────────────────────────
  if (phase === 'voice') {
    return (
      <div style={{ maxWidth: 600 }}>
        <div style={{ background: 'var(--color-accent)', borderRadius: 12, padding: '1.5rem', color: '#fff', marginBottom: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎙️</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
            {wsStatus === 'connecting' ? 'Connecting to your interview coach…' :
             wsStatus === 'connected' ? 'Interview in progress — speak clearly' :
             'Session ended'}
          </div>
          <div style={{ fontSize: '0.875rem', opacity: 0.85 }}>
            {interviewType} interview for {role}
          </div>
          {wsStatus === 'connecting' && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.7 }}>
              Allow microphone access when prompted
            </div>
          )}
          {voiceError && (
            <div style={{ marginTop: '0.75rem', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontSize: '0.75rem', textAlign: 'left', wordBreak: 'break-all' as const }}>
              ⚠️ Error: {voiceError}
              <button type="button" onClick={() => { setVoiceError(''); startTextFallback(); }} style={{ display: 'block', marginTop: '0.4rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '0.75rem' }}>Switch to text mode</button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" onClick={endVoiceSession} style={{ background: 'var(--color-accent)', color: '#fff', border: 0, borderRadius: 8, padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}>
            End Interview & Get Feedback
          </button>
          <button type="button" onClick={reset} style={{ background: 'transparent', color: 'var(--color-on-surface-variant)', border: '1px solid var(--surface-container-high)', borderRadius: 8, padding: '0.75rem 1rem', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
          Note: This uses ElevenLabs Conversational AI. Your voice session is processed by ElevenLabs.
        </p>
      </div>
    );
  }

  // ── Text interview ────────────────────────────────────────────────────────
  if (phase === 'interview') {
    return (
      <div style={{ maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', background: 'var(--surface-container-low)', padding: '0.25rem 0.75rem', borderRadius: 999 }}>
            {interviewType} · {role}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            Question {transcript.length + 1} of {MAX_QUESTIONS}
          </span>
        </div>
        {transcript.map((entry, i) => (
          <div key={i} style={{ marginBottom: '1rem', padding: '0.875rem', background: 'var(--surface-container-low)', borderRadius: 8, borderLeft: '3px solid var(--color-accent)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Q{i + 1}</div>
            <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{entry.question}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>{entry.answer}</div>
          </div>
        ))}
        <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--color-accent)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Interviewer</div>
          <div style={{ color: '#fff', fontWeight: 500 }}>{loading ? '…' : currentQuestion}</div>
        </div>
        <textarea value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)} placeholder="Type your answer here…" rows={4} style={{ width: '100%', border: '1px solid var(--surface-container-high)', borderRadius: 8, padding: '0.75rem', fontSize: '0.9rem', background: 'var(--color-surface)', color: 'var(--color-on-surface)', boxSizing: 'border-box', resize: 'vertical', marginBottom: '0.75rem' }} />
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" onClick={submitAnswer} disabled={loading || !currentAnswer.trim()} style={{ background: 'var(--color-accent)', color: '#fff', border: 0, borderRadius: 8, padding: '0.75rem 1.5rem', fontWeight: 700, cursor: loading || !currentAnswer.trim() ? 'not-allowed' : 'pointer', opacity: loading || !currentAnswer.trim() ? 0.6 : 1 }}>
            {loading ? '…' : transcript.length + 1 >= MAX_QUESTIONS ? 'Finish & Get Feedback' : 'Next Question →'}
          </button>
          <button type="button" onClick={() => getFeedback(transcript)} disabled={loading || transcript.length === 0} style={{ background: 'transparent', color: 'var(--color-on-surface-variant)', border: '1px solid var(--surface-container-high)', borderRadius: 8, padding: '0.75rem 1rem', fontWeight: 600, cursor: 'pointer' }}>
            End Early & Get Feedback
          </button>
        </div>
      </div>
    );
  }

  // ── Feedback ──────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ background: 'var(--surface-container-low)', borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--surface-container-high)' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-on-surface)' }}>
          Interview Feedback
        </h3>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--color-on-surface)' }}>{feedback}</div>
      </div>
      <button type="button" onClick={reset} style={{ background: 'var(--color-accent)', color: '#fff', border: 0, borderRadius: 8, padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}>
        Practice Again
      </button>
      <ToolFollowThrough toolType="interview_coach" output={feedback} />
      {pastSessionsSection}
    </div>
  );
}
