'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type InterviewType = 'technical' | 'behavioral' | 'general';
type Speaker = 'interviewer' | 'candidate';

interface TranscriptTurn {
  speaker: Speaker;
  text: string;
  timestamp: Date;
}

interface SessionState {
  active: boolean;
  loading: boolean;
  questionIndex: number;
  isFeedback: boolean;
  saved: boolean;
}

const INTERVIEW_TYPES: { value: InterviewType; label: string; icon: string; desc: string }[] = [
  { value: 'general', label: 'General', icon: 'chat', desc: 'Background, motivation & fit' },
  { value: 'behavioral', label: 'Behavioral', icon: 'psychology', desc: 'Past experiences via STAR' },
  { value: 'technical', label: 'Technical', icon: 'code', desc: 'Skills & problem-solving' },
];

export default function InterviewCoach() {
  const [role, setRole] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('general');
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [candidateInput, setCandidateInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);

  const [session, setSession] = useState<SessionState>({
    active: false,
    loading: false,
    questionIndex: 0,
    isFeedback: false,
    saved: false,
  });

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const playVoice = useCallback(async (text: string) => {
    if (!voiceEnabled) return;
    setVoiceLoading(true);
    try {
      const res = await fetch('/api/ai/interview-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play();
    } catch {
      // Voice is optional — fail silently
    } finally {
      setVoiceLoading(false);
    }
  }, [voiceEnabled]);

  const sendTurn = useCallback(
    async (message: string, currentTranscript: TranscriptTurn[], qIndex: number) => {
      setSession((s) => ({ ...s, loading: true }));
      setError('');

      try {
        const res = await fetch('/api/interview/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            interviewType,
            transcript: currentTranscript.map((t) => ({
              speaker: t.speaker,
              text: t.text,
            })),
            candidateMessage: message,
            questionIndex: qIndex,
          }),
        });

        const data = (await res.json()) as {
          message?: string;
          isFeedback?: boolean;
          questionIndex?: number;
          error?: string;
        };

        if (!res.ok || !data.message) {
          setError(data.error ?? 'Failed to get response');
          setSession((s) => ({ ...s, loading: false }));
          return;
        }

        const interviewerTurn: TranscriptTurn = {
          speaker: 'interviewer',
          text: data.message,
          timestamp: new Date(),
        };

        setTranscript((prev) => [...prev, interviewerTurn]);

        if (data.isFeedback) {
          setFeedback(data.message);
          setSession((s) => ({
            ...s,
            loading: false,
            isFeedback: true,
            questionIndex: data.questionIndex ?? qIndex,
          }));
        } else {
          setSession((s) => ({
            ...s,
            loading: false,
            questionIndex: data.questionIndex ?? qIndex + 1,
          }));
        }

        await playVoice(data.message);
      } catch {
        setError('Network error. Please try again.');
        setSession((s) => ({ ...s, loading: false }));
      }
    },
    [role, interviewType, playVoice]
  );

  const startInterview = useCallback(async () => {
    if (!role.trim()) {
      setError('Please enter a job role to practice for.');
      return;
    }
    setTranscript([]);
    setFeedback('');
    setCandidateInput('');
    setError('');
    setSession({
      active: true,
      loading: false,
      questionIndex: 0,
      isFeedback: false,
      saved: false,
    });

    await sendTurn('', [], 0);
  }, [role, sendTurn]);

  const submitAnswer = useCallback(async () => {
    const msg = candidateInput.trim();
    if (!msg || session.loading) return;

    const candidateTurn: TranscriptTurn = {
      speaker: 'candidate',
      text: msg,
      timestamp: new Date(),
    };

    const updatedTranscript = [...transcript, candidateTurn];
    setTranscript(updatedTranscript);
    setCandidateInput('');

    await sendTurn(msg, updatedTranscript, session.questionIndex);
  }, [candidateInput, session.loading, session.questionIndex, transcript, sendTurn]);

  const saveSession = useCallback(async () => {
    try {
      const res = await fetch('/api/interview/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          interviewType,
          transcript: transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
          feedback,
        }),
      });
      if (res.ok) {
        setSession((s) => ({ ...s, saved: true }));
      }
    } catch {
      // non-critical
    }
  }, [role, interviewType, transcript, feedback]);

  const resetSession = () => {
    setSession({
      active: false,
      loading: false,
      questionIndex: 0,
      isFeedback: false,
      saved: false,
    });
    setTranscript([]);
    setFeedback('');
    setCandidateInput('');
    setError('');
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitAnswer();
    }
  };

  // ── SETUP SCREEN ──────────────────────────────────────────────
  if (!session.active) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Role Input */}
        <div
          style={{
            background: 'var(--surface-container)',
            borderRadius: 12,
            padding: '1.5rem',
            marginBottom: '1.25rem',
            border: '1px solid var(--surface-container-high)',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-on-surface-variant)',
              marginBottom: '0.6rem',
            }}
          >
            Job Role
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Software Engineer, Project Manager, Data Analyst..."
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              border: '1px solid var(--surface-container-highest)',
              background: 'var(--color-surface)',
              color: 'var(--color-on-surface)',
              fontSize: '0.95rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Interview Type */}
        <div
          style={{
            background: 'var(--surface-container)',
            borderRadius: 12,
            padding: '1.5rem',
            marginBottom: '1.25rem',
            border: '1px solid var(--surface-container-high)',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-on-surface-variant)',
              marginBottom: '0.75rem',
            }}
          >
            Interview Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {INTERVIEW_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setInterviewType(t.value)}
                style={{
                  padding: '0.9rem 0.75rem',
                  borderRadius: 10,
                  border: `2px solid ${interviewType === t.value ? 'var(--color-accent)' : 'var(--surface-container-high)'}`,
                  background:
                    interviewType === t.value
                      ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                      : 'var(--color-surface)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    display: 'block',
                    fontSize: '1.4rem',
                    color: interviewType === t.value ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                    marginBottom: '0.35rem',
                  }}
                >
                  {t.icon}
                </span>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color:
                      interviewType === t.value ? 'var(--color-accent)' : 'var(--color-on-surface)',
                  }}
                >
                  {t.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)', marginTop: '0.2rem' }}>
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Toggle */}
        <div
          style={{
            background: 'var(--surface-container)',
            borderRadius: 12,
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid var(--surface-container-high)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
              🎙️ Voice Playback
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', marginTop: '0.15rem' }}>
              Hear the interviewer&apos;s questions spoken aloud
            </div>
          </div>
          <button
            onClick={() => setVoiceEnabled((v) => !v)}
            style={{
              width: 48,
              height: 26,
              borderRadius: 13,
              border: 'none',
              background: voiceEnabled ? 'var(--color-accent)' : 'var(--surface-container-highest)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: voiceEnabled ? 24 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s',
              }}
            />
          </button>
        </div>

        {error && (
          <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
        )}

        <button
          onClick={() => void startInterview()}
          disabled={!role.trim()}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: 10,
            border: 'none',
            background: role.trim() ? 'var(--color-accent)' : 'var(--surface-container-highest)',
            color: role.trim() ? 'white' : 'var(--color-on-surface-variant)',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: role.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
            play_arrow
          </span>
          Start Interview
        </button>
      </div>
    );
  }

  // ── ACTIVE SESSION ─────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Session Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: 'var(--surface-container)',
          borderRadius: 10,
          border: '1px solid var(--surface-container-high)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: session.isFeedback ? 'var(--color-accent)' : '#22c55e',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
            {role} · {INTERVIEW_TYPES.find((t) => t.value === interviewType)?.label} Interview
          </span>
          {!session.isFeedback && (
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-on-surface-variant)',
                background: 'var(--surface-container-high)',
                padding: '0.2rem 0.5rem',
                borderRadius: 4,
              }}
            >
              Q {session.questionIndex}
            </span>
          )}
        </div>
        <button
          onClick={resetSession}
          style={{
            fontSize: '0.8rem',
            color: 'var(--color-on-surface-variant)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
            restart_alt
          </span>
          New Session
        </button>
      </div>

      {/* Transcript */}
      <div
        style={{
          background: 'var(--surface-container)',
          borderRadius: 12,
          border: '1px solid var(--surface-container-high)',
          padding: '1.25rem',
          marginBottom: '1rem',
          minHeight: 300,
          maxHeight: 480,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {session.loading && transcript.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--color-on-surface-variant)',
              fontSize: '0.85rem',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }}
            >
              progress_activity
            </span>
            Setting up your interview...
          </div>
        )}

        {transcript.map((turn, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: turn.speaker === 'candidate' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                fontSize: '0.73rem',
                fontWeight: 600,
                color: 'var(--color-on-surface-variant)',
                marginBottom: '0.3rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {turn.speaker === 'interviewer' ? '🎙️ Interviewer' : '🙋 You'}
            </div>
            <div
              style={{
                maxWidth: '85%',
                padding: '0.75rem 1rem',
                borderRadius: turn.speaker === 'candidate' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background:
                  turn.speaker === 'candidate'
                    ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                    : 'var(--surface-container-high)',
                color: 'var(--color-on-surface)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                border:
                  turn.speaker === 'candidate'
                    ? '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)'
                    : '1px solid var(--surface-container-highest)',
              }}
            >
              {turn.text}
            </div>
          </div>
        ))}

        {session.loading && transcript.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: '0.3rem' }}>
            <div
              style={{
                fontSize: '0.73rem',
                fontWeight: 600,
                color: 'var(--color-on-surface-variant)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              🎙️ Interviewer
            </div>
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px 12px 12px 4px',
                background: 'var(--surface-container-high)',
                border: '1px solid var(--surface-container-highest)',
                display: 'flex',
                gap: '0.3rem',
                alignItems: 'center',
              }}
            >
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--color-on-surface-variant)',
                    opacity: 0.6,
                    animation: `bounce 1.2s ease-in-out ${d * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>

      {/* Feedback Banner */}
      {session.isFeedback && feedback && (
        <div
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
            borderRadius: 12,
            padding: '1.25rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-accent)',
              marginBottom: '0.5rem',
            }}
          >
            📋 Interview Feedback
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--color-on-surface)' }}>
            {feedback}
          </p>
          {!session.saved && (
            <button
              onClick={() => void saveSession()}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: 'none',
                background: 'var(--color-accent)',
                color: 'white',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>
                save
              </span>
              Save to History
            </button>
          )}
          {session.saved && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#22c55e', fontWeight: 600 }}>
              ✓ Session saved to history
            </p>
          )}
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>
      )}

      {/* Input Area */}
      {!session.isFeedback && (
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-end',
          }}
        >
          <textarea
            ref={inputRef}
            value={candidateInput}
            onChange={(e) => setCandidateInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
            disabled={session.loading}
            rows={3}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: 10,
              border: '1px solid var(--surface-container-highest)',
              background: 'var(--color-surface)',
              color: 'var(--color-on-surface)',
              fontSize: '0.9rem',
              resize: 'none',
              opacity: session.loading ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => void submitAnswer()}
            disabled={!candidateInput.trim() || session.loading}
            style={{
              padding: '0.75rem',
              borderRadius: 10,
              border: 'none',
              background:
                candidateInput.trim() && !session.loading
                  ? 'var(--color-accent)'
                  : 'var(--surface-container-highest)',
              color:
                candidateInput.trim() && !session.loading ? 'white' : 'var(--color-on-surface-variant)',
              cursor: candidateInput.trim() && !session.loading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'fit-content',
              alignSelf: 'flex-end',
              marginBottom: 1,
            }}
          >
            {voiceLoading ? (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.2rem', animation: 'spin 1s linear infinite' }}
              >
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>
                send
              </span>
            )}
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
