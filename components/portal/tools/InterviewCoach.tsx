'use client';

import { useState, useRef, useEffect } from 'react';

type TranscriptEntry = {
  question: string;
  answer: string;
  feedback?: { strengths: string[]; improve: string[]; example: string };
};
type Phase = 'setup' | 'voice' | 'interview' | 'complete';

const INTERVIEW_TYPES = ['Behavioral', 'Technical', 'General'];
const MAX_QUESTIONS = 5;

export default function InterviewCoach() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [role, setRole] = useState('');
  const [interviewType, setInterviewType] = useState('Behavioral');
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [mode, setMode] = useState<'voice' | 'text'>('text');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<TranscriptEntry['feedback'] | null>(null);
  const [wsStatus, setWsStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const intentionalCloseRef = useRef(false);

  useEffect(() => { return () => { if (wsRef.current) wsRef.current.close(); }; }, []);

  const questionNumber = transcript.length + 1;
  const progress = Math.round((transcript.length / MAX_QUESTIONS) * 100);

  async function startInterview() {
    if (!role.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/interview/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, interviewType }),
      });
      const data = await res.json() as { mode: 'voice' | 'text'; signedUrl?: string; firstQuestion?: string };
      setMode(data.mode);
      if (data.mode === 'voice' && data.signedUrl) {
        setPhase('voice');
        connectVoice(data.signedUrl);
      } else {
        setCurrentQuestion(data.firstQuestion ?? `Tell me about yourself and why you're interested in the ${role} role.`);
        setPhase('interview');
      }
    } finally { setLoading(false); }
  }

  function connectVoice(url: string) {
    setWsStatus('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => setWsStatus('connected');
    ws.onclose = () => {
      setWsStatus('ended');
      if (!intentionalCloseRef.current) { setPhase('complete'); }
      intentionalCloseRef.current = false;
    };
    ws.onerror = () => { setMode('text'); startTextFallback(); };
  }

  async function startTextFallback() {
    const res = await fetch('/api/interview/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, interviewType, forceText: true }),
    });
    const data = await res.json() as { firstQuestion?: string };
    setCurrentQuestion(data.firstQuestion ?? `Tell me about yourself and your interest in the ${role} role.`);
    setPhase('interview');
  }

  async function getInlineFeedback(question: string, answer: string) {
    setFeedbackLoading(true);
    try {
      const res = await fetch('/api/interview/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, interviewType, question, answer }),
      });
      if (res.ok) {
        const data = await res.json() as { strengths: string[]; improve: string[]; example: string };
        setCurrentFeedback(data);
        return data;
      }
    } finally { setFeedbackLoading(false); }
    return null;
  }

  async function submitAnswer() {
    if (!currentAnswer.trim()) return;
    setLoading(true);
    const feedback = await getInlineFeedback(currentQuestion, currentAnswer);
    const newEntry: TranscriptEntry = { question: currentQuestion, answer: currentAnswer, feedback: feedback ?? undefined };
    const newTranscript = [...transcript, newEntry];
    setTranscript(newTranscript);
    setCurrentAnswer('');
    setLoading(false);

    if (newTranscript.length >= MAX_QUESTIONS) {
      setPhase('complete');
      return;
    }

    // Get next question
    setLoading(true);
    try {
      const res = await fetch('/api/interview/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, interviewType, transcript: newTranscript, nextQuestion: true, forceText: true }),
      });
      const data = await res.json() as { firstQuestion: string };
      setCurrentQuestion(data.firstQuestion);
      setCurrentFeedback(null);
    } finally { setLoading(false); }
  }

  function endVoice() { intentionalCloseRef.current = true; if (wsRef.current) wsRef.current.close(); setPhase('complete'); }

  function reset() {
    intentionalCloseRef.current = true;
    setPhase('setup'); setRole(''); setInterviewType('Behavioral');
    setCurrentQuestion(''); setCurrentAnswer(''); setTranscript([]);
    setCurrentFeedback(null); setWsStatus('idle'); setMode('text');
    if (wsRef.current) wsRef.current.close();
  }

  // ── Setup ────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--color-on-surface)' }}>Target Role *</label>
          <input type="text" value={role} onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Software Engineer, Project Manager, Data Analyst"
            style={{ width: '100%', border: '1px solid var(--surface-container-high)', borderRadius: 8, padding: '0.625rem 0.875rem', fontSize: '0.9rem', background: 'var(--color-surface)', color: 'var(--color-on-surface)', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--color-on-surface)' }}>Interview Type</label>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            {INTERVIEW_TYPES.map((t) => (
              <button key={t} onClick={() => setInterviewType(t)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1.5px solid', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', background: interviewType === t ? 'var(--color-accent)' : 'transparent', color: interviewType === t ? '#fff' : 'var(--color-accent)', borderColor: 'var(--color-accent)' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <button onClick={startInterview} disabled={loading || !role.trim()}
          style={{ background: 'var(--color-accent)', color: '#fff', border: 0, borderRadius: 8, padding: '0.875rem 2rem', fontWeight: 700, fontSize: '1rem', cursor: loading || !role.trim() ? 'not-allowed' : 'pointer', opacity: loading || !role.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>mic</span>
          {loading ? 'Starting…' : 'Start Interview'}
        </button>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
          Voice-powered by ElevenLabs · Text mode always available as fallback
        </p>
      </div>
    );
  }

  // ── Voice ────────────────────────────────────────────────────────────────
  if (phase === 'voice') {
    return (
      <div style={{ maxWidth: 600 }}>
        <div style={{ background: 'var(--color-accent)', borderRadius: 12, padding: '1.5rem', color: '#fff', marginBottom: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎙️</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
            {wsStatus === 'connecting' ? 'Connecting…' : wsStatus === 'connected' ? 'Live — speak clearly' : 'Session ended'}
          </div>
          <div style={{ fontSize: '0.875rem', opacity: 0.85 }}>{interviewType} interview for {role}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={endVoice} style={{ background: 'var(--color-accent)', color: '#fff', border: 0, borderRadius: 8, padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}>End &amp; Get Summary</button>
          <button onClick={reset} style={{ background: 'transparent', color: 'var(--color-on-surface-variant)', border: '1px solid var(--surface-container-high)', borderRadius: 8, padding: '0.75rem 1rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    );
  }

  // ── Interview (Stitch layout) ─────────────────────────────────────────────
  if (phase === 'interview') {
    return (
      <div style={{ maxWidth: 900 }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', background: 'var(--surface-container-low)', padding: '0.25rem 0.75rem', borderRadius: 999 }}>
            Question {questionNumber} of {MAX_QUESTIONS}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{interviewType} · {role}</span>
        </div>
        <div style={{ height: 4, background: 'var(--surface-container-high)', borderRadius: 999, marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #8c0f37, #ad2c4d)', borderRadius: 999, transition: 'width 0.3s ease' }} />
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid var(--surface-container-high)', borderRadius: 12, overflow: 'hidden', minHeight: 480 }}>
          {/* LEFT: Question + Answer */}
          <div style={{ padding: '1.5rem', borderRight: '1px solid var(--surface-container-high)' }}>
            {/* Question card */}
            <div style={{ background: 'rgba(173,44,77,0.08)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem', borderLeft: '4px solid var(--color-accent)' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent)', marginBottom: '0.5rem' }}>Interview Question</p>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-on-surface)', lineHeight: 1.5, margin: 0 }}>
                {loading && !currentQuestion ? '…' : currentQuestion}
              </p>
            </div>

            {/* Answer input */}
            <textarea value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer here…" rows={8}
              style={{ width: '100%', border: '1px solid var(--surface-container-high)', borderRadius: '0.5rem', padding: '0.875rem', fontSize: '0.875rem', background: 'var(--color-surface)', color: 'var(--color-on-surface)', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '1rem' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={reset} style={{ padding: '0.625rem 1.25rem', background: 'var(--surface-container-low)', border: 'none', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: 'var(--color-on-surface-variant)' }}>
                ← Restart
              </button>
              <button onClick={submitAnswer} disabled={loading || feedbackLoading || !currentAnswer.trim()}
                style={{ padding: '0.625rem 1.5rem', background: 'linear-gradient(135deg,#8c0f37,#ad2c4d)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: loading || !currentAnswer.trim() ? 'not-allowed' : 'pointer', opacity: loading || !currentAnswer.trim() ? 0.6 : 1 }}>
                {loading ? '…' : questionNumber >= MAX_QUESTIONS ? 'Finish →' : 'Get Feedback →'}
              </button>
            </div>
          </div>

          {/* RIGHT: AI Feedback */}
          <div style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>AI Feedback</p>

            {feedbackLoading && (
              <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>Analyzing your answer…</div>
            )}

            {!feedbackLoading && !currentFeedback && transcript.length === 0 && (
              <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Answer the question on the left and click <strong>Get Feedback</strong> — your AI coach will review your response using the STAR method and role-specific criteria.
              </div>
            )}

            {currentFeedback && !feedbackLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'rgba(74,155,79,0.1)', borderRadius: '0.75rem', padding: '1.125rem', borderLeft: '4px solid #166534' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>✅ Strengths</p>
                  <ul style={{ fontSize: '0.825rem', color: 'var(--color-on-surface)', paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {currentFeedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div style={{ background: 'rgba(173,44,77,0.08)', borderRadius: '0.75rem', padding: '1.125rem', borderLeft: '4px solid var(--color-accent)' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>🎯 Improve</p>
                  <ul style={{ fontSize: '0.825rem', color: 'var(--color-on-surface)', paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {currentFeedback.improve.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                {currentFeedback.example && (
                  <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.75rem', padding: '1.125rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>💡 Example Strong Answer</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>&ldquo;{currentFeedback.example}&rdquo;</p>
                  </div>
                )}
              </div>
            )}

            {/* Past Q&A summary */}
            {transcript.length > 0 && (
              <div style={{ marginTop: currentFeedback ? '1.5rem' : 0 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>Previous Answers</p>
                {transcript.map((entry, i) => (
                  <div key={i} style={{ marginBottom: '0.5rem', padding: '0.625rem', background: 'var(--surface-container-low)', borderRadius: 6, fontSize: '0.8rem', borderLeft: '2px solid var(--surface-container-high)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.2rem' }}>Q{i + 1}: {entry.question.substring(0, 60)}…</div>
                    <div style={{ color: 'var(--color-on-surface-variant)' }}>{entry.answer.substring(0, 80)}…</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Complete ──────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ background: 'var(--surface-container-low)', borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--surface-container-high)' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-on-surface)' }}>
          {mode === 'voice' ? 'Voice Session Complete' : 'Interview Complete'}
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
          You answered {transcript.length} question{transcript.length !== 1 ? 's' : ''} in this {interviewType.toLowerCase()} interview for {role}.
        </p>
        {transcript.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {transcript.map((entry, i) => (
              <div key={i} style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--surface-container-high)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '0.375rem' }}>Q{i + 1}</div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>{entry.question}</div>
                <div style={{ fontSize: '0.825rem', color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>{entry.answer}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <button onClick={reset} style={{ background: 'var(--color-accent)', color: '#fff', border: 0, borderRadius: 8, padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}>
        Practice Again
      </button>
    </div>
  );
}
