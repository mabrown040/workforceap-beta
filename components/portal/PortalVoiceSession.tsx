'use client';

import { useState, useEffect, useRef } from 'react';
import { Conversation } from '@elevenlabs/client';

type Phase = 'pre' | 'connecting' | 'active' | 'done';

export type PortalVoiceSessionProps = {
  /** POST endpoint that returns `{ signedUrl: string }` */
  sessionEndpoint: string;
  title: string;
  description: string;
  accent?: string;
  accentDark?: string;
  speakingLabel?: string;
  listeningLabel?: string;
};

const PULSE_STYLE = `
@keyframes pvs-breathe { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.08); opacity: 1; } }
@keyframes pvs-pulse-ring { 0% { transform: scale(0.95); opacity: 0.6; } 70% { transform: scale(1.15); opacity: 0; } 100% { transform: scale(1.15); opacity: 0; } }
@keyframes pvs-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;

export default function PortalVoiceSession({
  sessionEndpoint,
  title,
  description,
  accent = '#8c0f37',
  accentDark = '#6b0c29',
  speakingLabel = 'Assistant is speaking…',
  listeningLabel = 'Listening — speak when ready',
}: PortalVoiceSessionProps) {
  const [phase, setPhase] = useState<Phase>('pre');
  const [voiceError, setVoiceError] = useState('');
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const convRef = useRef<Conversation | null>(null);
  const intentionalRef = useRef(false);

  useEffect(() => {
    if (document.getElementById('pvs-styles')) return;
    const el = document.createElement('style');
    el.id = 'pvs-styles';
    el.textContent = PULSE_STYLE;
    document.head.appendChild(el);
  }, []);

  useEffect(() => {
    return () => {
      intentionalRef.current = true;
      convRef.current?.endSession();
    };
  }, []);

  async function startSession() {
    setVoiceError('');
    setPhase('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setVoiceError('Microphone access is required. Allow it in your browser and try again.');
      setPhase('pre');
      return;
    }

    let signedUrl: string;
    try {
      const res = await fetch(sessionEndpoint, { method: 'POST' });
      const data = (await res.json()) as { signedUrl?: string; error?: string };
      if (!res.ok || !data.signedUrl) {
        throw new Error(data.error ?? 'Voice is not available right now.');
      }
      signedUrl = data.signedUrl;
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Could not start session.');
      setPhase('pre');
      return;
    }

    try {
      const conv = await Conversation.startSession({
        signedUrl,
        onConnect: () => setPhase('active'),
        onDisconnect: (details) => {
          if (!intentionalRef.current) {
            if ((details as { reason?: string })?.reason === 'error') {
              setVoiceError((details as { message?: string })?.message ?? 'Connection lost');
            }
          }
          intentionalRef.current = false;
          setPhase('done');
          setAgentSpeaking(false);
        },
        onMessage: (event) => {
          const ev = event as unknown as Record<string, unknown>;
          if (ev.type === 'agent_response') setAgentSpeaking(true);
          if (ev.type === 'user_transcript') setAgentSpeaking(false);
        },
        onError: (msg) => {
          setVoiceError(String(msg) || 'Connection error');
          setPhase('pre');
        },
      });
      convRef.current = conv;
    } catch (err) {
      setVoiceError(String(err));
      setPhase('pre');
    }
  }

  function endSession() {
    intentionalRef.current = true;
    convRef.current?.endSession();
    setPhase('done');
    setAgentSpeaking(false);
  }

  function reset() {
    intentionalRef.current = true;
    convRef.current?.endSession();
    convRef.current = null;
    intentionalRef.current = false;
    setPhase('pre');
    setVoiceError('');
    setAgentSpeaking(false);
  }

  const bgSoft = `${accent}14`;

  if (phase === 'pre') {
    return (
      <div style={{ maxWidth: 560, animation: 'pvs-fade-in 0.4s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, ${accent}, ${accentDark})`,
                animation: 'pvs-breathe 3.5s ease-in-out infinite',
                boxShadow: `0 0 28px ${accent}44`,
              }}
            />
          </div>
        </div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.5rem', textAlign: 'center' }}>
          {title}
        </h3>
        <p style={{ color: 'var(--color-on-surface-variant)', textAlign: 'center', marginBottom: '1.25rem', lineHeight: 1.55, fontSize: '0.9rem' }}>
          {description}
        </p>
        {voiceError ? (
          <div
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              color: '#b91c1c',
            }}
          >
            {voiceError}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => void startSession()}
          style={{
            display: 'block',
            width: '100%',
            background: accent,
            color: '#fff',
            border: 0,
            borderRadius: 10,
            padding: '0.875rem',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: `0 4px 20px ${accent}44`,
          }}
        >
          Start voice session
        </button>
      </div>
    );
  }

  if (phase === 'connecting') {
    return (
      <div style={{ maxWidth: 560, textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, ${accent}, ${accentDark})`,
              animation: 'pvs-breathe 1.8s ease-in-out infinite',
            }}
          />
        </div>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>Connecting…</p>
      </div>
    );
  }

  if (phase === 'active') {
    return (
      <div style={{ maxWidth: 560, animation: 'pvs-fade-in 0.35s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative', width: 88, height: 88 }}>
            <div
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                border: `2px solid ${accent}`,
                animation: 'pvs-pulse-ring 2s ease-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, ${accent}, ${accentDark})`,
                animation: 'pvs-breathe 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.35rem' }}>
            {agentSpeaking ? speakingLabel : listeningLabel}
          </div>
          <span
            style={{
              display: 'inline-block',
              padding: '0.2rem 0.65rem',
              borderRadius: 999,
              background: bgSoft,
              fontSize: '0.75rem',
              color: accent,
              fontWeight: 600,
            }}
          >
            {agentSpeaking ? 'Speaking' : 'Listening'}
          </span>
        </div>
        <button
          type="button"
          onClick={endSession}
          style={{
            width: '100%',
            background: accent,
            color: '#fff',
            border: 0,
            borderRadius: 10,
            padding: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          End session
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, textAlign: 'center' }}>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1rem', fontSize: '0.9rem' }}>Session ended.</p>
      <button
        type="button"
        onClick={reset}
        style={{
          background: 'var(--surface-container-highest)',
          color: 'var(--color-on-surface)',
          border: '1px solid var(--outline-variant)',
          borderRadius: 10,
          padding: '0.65rem 1.25rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Start again
      </button>
    </div>
  );
}
