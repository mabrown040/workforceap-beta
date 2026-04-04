'use client';

import { useState, useEffect, useRef } from 'react';
import { Conversation } from '@elevenlabs/client';

type VoiceDisconnectDetails = {
  reason?: string;
  message?: string;
  closeCode?: number;
  closeReason?: string;
  context?: Event;
};

type VoiceErrorContext = {
  errorType?: string;
  code?: number | string;
  debugMessage?: string;
  details?: unknown;
  closeCode?: number;
  closeReason?: string;
  stage?: string;
<<<<<<< HEAD
=======
  retryingWithoutOverrides?: boolean;
>>>>>>> origin/master
};

function stringifyUnknown(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (!value) return undefined;
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function formatVoiceRuntimeReason(message?: string, context?: VoiceErrorContext): string {
  const parts: string[] = [];
  const cleanMessage = message?.trim();
  if (cleanMessage) parts.push(cleanMessage);

  if (context?.errorType) parts.push(`type=${context.errorType}`);
  if (context?.code !== undefined && context.code !== null) parts.push(`code=${String(context.code)}`);
  if (context?.closeCode !== undefined && context.closeCode !== null) parts.push(`close=${String(context.closeCode)}`);
  if (context?.closeReason) parts.push(`closeReason=${context.closeReason}`);
  if (context?.stage) parts.push(`stage=${context.stage}`);
<<<<<<< HEAD
=======
  if (context?.retryingWithoutOverrides) parts.push('retry=no-overrides');
>>>>>>> origin/master
  if (context?.debugMessage) parts.push(`debug=${context.debugMessage}`);

  const detailText = stringifyUnknown(context?.details);
  if (detailText) parts.push(`details=${detailText}`);

  return parts.join(' | ') || 'Unknown voice session error';
}

function formatDisconnectReason(details?: VoiceDisconnectDetails): string {
  if (!details) return 'Connection lost — please try again.';

  const raw = details.message?.trim() || details.closeReason?.trim();
  const suffix: string[] = [];
  if (details.reason) suffix.push(`reason=${details.reason}`);
  if (details.closeCode !== undefined) suffix.push(`close=${details.closeCode}`);
  if (details.closeReason && details.closeReason !== raw) suffix.push(`closeReason=${details.closeReason}`);
  const base = raw || 'Connection lost — please try again.';
  return suffix.length ? `${base} (${suffix.join(', ')})` : base;
}

type Phase = 'pre' | 'connecting' | 'active' | 'done';

/** Voice session UI phase — use with optional video recording (WebRTC). */
export type VoiceSessionPhase = Phase;

export type ResumeSuggestion = {
  original?: string;
  suggested: string;
  context: string;
};

export type PortalVoiceSessionProps = {
  /** POST endpoint that returns `{ signedUrl: string }` */
  sessionEndpoint: string;
  /** JSON body for POST (e.g. role + interview type). Omit for empty body. */
  sessionPayload?: Record<string, unknown>;
  title: string;
  description: string;
  accent?: string;
  accentDark?: string;
  speakingLabel?: string;
  listeningLabel?: string;
  /** If set, transcript will be parsed for suggestions after session ends */
  suggestionsEndpoint?: string;
  /** Called when user accepts a suggestion */
  onAcceptSuggestion?: (s: ResumeSuggestion) => void;
  /** Fired when a new transcript line is captured (for live coaching UI) */
  onTranscriptChunk?: (chunk: { speaker: 'agent' | 'user'; text: string }) => void;
  /** Fired whenever session phase changes (e.g. sync MediaRecorder with voice session). */
  onPhaseChange?: (phase: VoiceSessionPhase) => void;
};

const PULSE_STYLE = `
@keyframes pvs-breathe { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.08); opacity: 1; } }
@keyframes pvs-pulse-ring { 0% { transform: scale(0.95); opacity: 0.6; } 70% { transform: scale(1.15); opacity: 0; } 100% { transform: scale(1.15); opacity: 0; } }
@keyframes pvs-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;

export default function PortalVoiceSession({
  sessionEndpoint,
  sessionPayload,
  title,
  description,
  accent = '#8c0f37',
  accentDark = '#6b0c29',
  speakingLabel = 'Assistant is speaking…',
  listeningLabel = 'Listening — speak when ready',
  suggestionsEndpoint,
  onAcceptSuggestion,
  onTranscriptChunk,
  onPhaseChange,
}: PortalVoiceSessionProps) {
  const [phase, setPhase] = useState<Phase>('pre');
  const [voiceError, setVoiceError] = useState('');
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [suggestions, setSuggestions] = useState<ResumeSuggestion[]>([]);
  const [parsingSuggestions, setParsingSuggestions] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const convRef = useRef<Conversation | null>(null);
  const intentionalRef = useRef(false);
  const transcriptRef = useRef<Array<{ speaker: string; text: string }>>([]);
  const phaseRef = useRef<Phase>('pre');
  const voiceErrorRef = useRef('');

  useEffect(() => {
    phaseRef.current = phase;
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    voiceErrorRef.current = voiceError;
  }, [voiceError]);

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
    let dynamicVariables: Record<string, string | number | boolean> | undefined;
    try {
      const res = await fetch(sessionEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: sessionPayload ? JSON.stringify(sessionPayload) : '{}',
      });
      const data = (await res.json()) as {
        signedUrl?: string;
        dynamicVariables?: Record<string, string | number | boolean>;
        error?: string;
      };
      if (!res.ok || !data.signedUrl) {
        throw new Error(data.error ?? 'Voice is not available right now.');
      }
      signedUrl = data.signedUrl;
      dynamicVariables = data.dynamicVariables;
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Could not start session.');
      setPhase('pre');
      return;
    }

<<<<<<< HEAD
    try {
      const conv = await Conversation.startSession({
        signedUrl,
        ...(dynamicVariables && Object.keys(dynamicVariables).length > 0 ? { dynamicVariables } : {}),
        onConnect: () => setPhase('active'),
        onDisconnect: (details) => {
          const typed = (details ?? {}) as VoiceDisconnectDetails;
          const disconnectMessage = formatDisconnectReason(typed);
          const startupDisconnect = phaseRef.current === 'connecting';
          const hasExistingError = Boolean(voiceErrorRef.current);
          const shouldSurfaceError = !intentionalRef.current && (typed.reason === 'error' || startupDisconnect || hasExistingError);

          console.error('[voice] disconnect:', {
            reason: typed.reason,
            message: typed.message,
            closeCode: typed.closeCode,
            closeReason: typed.closeReason,
            contextType: typed.context?.type,
            phase: phaseRef.current,
            startupDisconnect,
            hasExistingError,
          });

          if (shouldSurfaceError) {
            const surfacedMessage = hasExistingError ? voiceErrorRef.current : disconnectMessage;
            setVoiceError(surfacedMessage);
            setPhase('pre');
          } else {
            setPhase('done');
          }
          intentionalRef.current = false;
          setAgentSpeaking(false);
        },
        onMessage: (event) => {
          const ev = event as unknown as Record<string, unknown>;
          if (ev.type === 'agent_response') {
            setAgentSpeaking(true);
            if (typeof ev.text === 'string' && ev.text.trim()) {
              transcriptRef.current.push({ speaker: 'agent', text: ev.text });
              onTranscriptChunk?.({ speaker: 'agent', text: ev.text });
            }
=======
    async function tryStartConversation(opts: { useOverrides: boolean; stage: string }) {
      const { useOverrides, stage } = opts;
      return Conversation.startSession({
        signedUrl,
        ...(useOverrides && dynamicCtx
          ? {
              overrides: {
                agent: {
                  prompt: { prompt: dynamicCtx },
                },
              },
            }
          : {}),
        onConnect: () => setPhase('active'),
        onDisconnect: (details) => {
          const typed = (details ?? {}) as VoiceDisconnectDetails;
          console.error('[voice] disconnect:', {
            stage,
            reason: typed.reason,
            message: typed.message,
            closeCode: typed.closeCode,
            closeReason: typed.closeReason,
            contextType: typed.context?.type,
          });
          if (!intentionalRef.current && typed.reason === 'error') {
            setVoiceError(formatDisconnectReason(typed));
            setPhase('pre');
          } else {
            setPhase('done');
          }
          intentionalRef.current = false;
          setAgentSpeaking(false);
        },
        onMessage: (event) => {
          const ev = event as unknown as Record<string, unknown>;
          if (ev.type === 'agent_response') {
            setAgentSpeaking(true);
            if (typeof ev.text === 'string' && ev.text.trim()) {
              transcriptRef.current.push({ speaker: 'agent', text: ev.text });
              onTranscriptChunk?.({ speaker: 'agent', text: ev.text });
            }
>>>>>>> origin/master
          }
          if (ev.type === 'user_transcript') {
            setAgentSpeaking(false);
            if (typeof ev.text === 'string' && ev.text.trim()) {
              transcriptRef.current.push({ speaker: 'user', text: ev.text });
              onTranscriptChunk?.({ speaker: 'user', text: ev.text });
            }
          }
        },
        onError: (msg, context) => {
          const errorText = formatVoiceRuntimeReason(String(msg) || 'Connection error', {
            ...(context as VoiceErrorContext | undefined),
<<<<<<< HEAD
=======
            stage,
            retryingWithoutOverrides: !useOverrides,
>>>>>>> origin/master
          });
          console.error('[voice] runtime error:', errorText, context);
          setVoiceError(errorText);
          setPhase('pre');
        },
      });
<<<<<<< HEAD
=======
    }

    try {
      let conv: Conversation | null = null;
      let firstError: unknown;

      if (dynamicCtx) {
        try {
          conv = await tryStartConversation({ useOverrides: true, stage: 'start-with-overrides' });
        } catch (err) {
          firstError = err;
          const fallbackMessage = formatVoiceRuntimeReason(err instanceof Error ? err.message : String(err), {
            stage: 'start-with-overrides',
          });
          console.error('[voice] start failed with overrides, retrying without overrides:', fallbackMessage, err);
          try {
            conv = await tryStartConversation({ useOverrides: false, stage: 'retry-without-overrides' });
          } catch (retryErr) {
            const retryMessage = formatVoiceRuntimeReason(retryErr instanceof Error ? retryErr.message : String(retryErr), {
              stage: 'retry-without-overrides',
              retryingWithoutOverrides: true,
            });
            console.error('[voice] retry without overrides failed:', retryMessage, retryErr);
            const firstMessage = formatVoiceRuntimeReason(firstError instanceof Error ? firstError.message : String(firstError), {
              stage: 'start-with-overrides',
            });
            throw new Error(`${firstMessage} | fallback=${retryMessage}`);
          }
        }
      } else {
        conv = await tryStartConversation({ useOverrides: false, stage: 'start-no-overrides' });
      }
>>>>>>> origin/master

      convRef.current = conv;
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : String(err));
      setPhase('pre');
    }
  }

  async function endSession() {
    intentionalRef.current = true;
    convRef.current?.endSession();
    setPhase('done');
    setAgentSpeaking(false);

    // Parse suggestions from transcript
    if (suggestionsEndpoint && transcriptRef.current.length > 0) {
      setParsingSuggestions(true);
      try {
        const res = await fetch(suggestionsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: transcriptRef.current }),
        });
        if (res.ok) {
          const data = (await res.json()) as { suggestions: ResumeSuggestion[] };
          setSuggestions(data.suggestions ?? []);
        }
      } catch (err) {
        console.error('[suggestion-parse]', err);
      } finally {
        setParsingSuggestions(false);
      }
    }
  }

  function reset() {
    intentionalRef.current = true;
    convRef.current?.endSession();
    convRef.current = null;
    intentionalRef.current = false;
    setPhase('pre');
    setVoiceError('');
    setAgentSpeaking(false);
    setSuggestions([]);
    setDismissed(new Set());
    transcriptRef.current = [];
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

  const activeSuggestions = suggestions.filter((_, i) => !dismissed.has(i));

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
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

      {parsingSuggestions && (
        <p style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', fontSize: '0.85rem', marginTop: '1rem' }}>
          Extracting suggestions from your session…
        </p>
      )}

      {activeSuggestions.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
            Coach suggestions ({activeSuggestions.length})
          </h4>
          {suggestions.map((s, i) =>
            dismissed.has(i) ? null : (
              <div
                key={i}
                style={{
                  background: 'var(--surface-container-low, #f8f5f4)',
                  border: '1px solid var(--outline-variant, #e0d6d3)',
                  borderRadius: 12,
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  animation: 'pvs-fade-in 0.3s ease both',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: s.original ? '1fr 1fr' : '1fr',
                    gap: '0.65rem',
                    marginBottom: '0.65rem',
                  }}
                >
                  {s.original ? (
                    <div
                      style={{
                        borderRadius: 10,
                        padding: '0.65rem 0.75rem',
                        background: 'rgba(127,127,127,0.08)',
                        border: '1px solid var(--outline-variant)',
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--color-on-surface-variant)',
                        }}
                      >
                        Before
                      </span>
                      <p
                        style={{
                          margin: '0.35rem 0 0',
                          fontSize: '0.85rem',
                          lineHeight: 1.45,
                          textDecoration: 'line-through',
                          color: 'var(--color-on-surface-variant)',
                        }}
                      >
                        {s.original}
                      </p>
                    </div>
                  ) : null}
                  <div
                    style={{
                      borderRadius: 10,
                      padding: '0.65rem 0.75rem',
                      background: 'rgba(22, 101, 52, 0.1)',
                      border: '1px solid rgba(22, 101, 52, 0.28)',
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: '#166534',
                      }}
                    >
                      After
                    </span>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', lineHeight: 1.45, fontWeight: 500, color: '#14532d' }}>
                      {s.suggested}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem', fontStyle: 'italic' }}>{s.context}</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      onAcceptSuggestion?.(s);
                      setDismissed((prev) => new Set(prev).add(i));
                    }}
                    style={{
                      background: accent,
                      color: '#fff',
                      border: 0,
                      borderRadius: 8,
                      padding: '0.45rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissed((prev) => new Set(prev).add(i))}
                    style={{
                      background: 'transparent',
                      color: 'var(--color-on-surface-variant)',
                      border: '1px solid var(--outline-variant)',
                      borderRadius: 8,
                      padding: '0.45rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    ✗ Deny
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
