'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
  type UIEvent,
} from 'react';
import type { BaseSessionConfig, Conversation } from '@elevenlabs/client';

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
  /**
   * Heading level for the title. Defaults to 'h3' (sub-section under a page-
   * level h2). Pass 'h2' when this voice session is the page's primary
   * top-level section (e.g. counselor portal staff voice block where the
   * page h1 is the only heading above it).
   */
  titleAs?: 'h2' | 'h3';
  description: string;
  accent?: string;
  accentDark?: string;
  speakingLabel?: string;
  listeningLabel?: string;
  /** If set, transcript will be parsed for suggestions after session ends */
  suggestionsEndpoint?: string;
  /** If set, transcript will be posted here after the session completes. */
  completionEndpoint?: string;
  /** Lightweight endpoint for periodic auto-save during session (no AI processing). */
  checkpointEndpoint?: string;
  /** Interval in ms for auto-saving transcript during active session. */
  checkpointIntervalMs?: number;
  /** Extra JSON fields to send alongside the transcript to `completionEndpoint`. */
  completionPayload?: Record<string, unknown>;
  /** Called when user accepts a suggestion */
  onAcceptSuggestion?: (s: ResumeSuggestion) => void;
  /**
   * When `delegatePostSessionSuggestions` is true, parsed post-session suggestions are passed here
   * instead of rendering the default "done" suggestion cards inside this component.
   */
  onPostSessionSuggestions?: (suggestions: ResumeSuggestion[]) => void;
  /** Do not show post-session Approve/Deny cards here — parent handles them (e.g. draft panel). */
  delegatePostSessionSuggestions?: boolean;
  /** When post-session parsing runs (after End session), for parent UI (e.g. draft panel loading line). */
  onPostSessionParsingChange?: (parsing: boolean) => void;
  /** Fired when a new transcript line is captured (for live coaching UI) */
  onTranscriptChunk?: (chunk: { speaker: 'agent' | 'user'; text: string }) => void;
  /** Fired whenever session phase changes (e.g. sync MediaRecorder with voice session). */
  onPhaseChange?: (phase: VoiceSessionPhase) => void;
  /**
   * If the first `Conversation.startSession` fails with dynamic variables, retry once without them.
   * Disable for resume coach so we never drop `resume_text` / `has_resume` context silently.
   * @default true
   */
  retryWithoutDynamicVariables?: boolean;
  /**
   * When true, debounced `sendContextualUpdate` runs whenever `sessionPayload.liveResumeDraft` (string)
   * changes while the session is active — keeps the agent aligned with the live editor after session start.
   */
  pushLiveResumeDraftContext?: boolean;
  /**
   * Show a scrollable live transcript during the call (ElevenLabs `onMessage`: `role` + `message`).
   * Prefer this over separate Whisper/Web Speech layers — one mic, one pipeline, lower latency.
   * @default true
   */
  showLiveTranscript?: boolean;
  /** Label for agent lines in the live transcript panel */
  liveTranscriptCoachLabel?: string;
  /** Label for user lines in the live transcript panel */
  liveTranscriptYouLabel?: string;
  /**
   * Request camera (video-only, no second mic) right after the mic probe — before network — so the
   * permission prompt stays tied to the Start click. Requires `videoStreamRef`.
   */
  acquireVideoForRecording?: boolean;
  /**
   * When `acquireVideoForRecording` is true and camera permission fails, still start the voice session.
   * Recording UI can retry camera later or show video-only errors without blocking the interview.
   * @default false
   */
  optionalCameraForRecording?: boolean;
  /** Set when `acquireVideoForRecording`; pass the same ref to `MockInterviewVideoRecorder`. */
  videoStreamRef?: MutableRefObject<MediaStream | null>;
  /**
   * ElevenLabs ConvAI session overrides (e.g. `{ tts: { voiceId } }` for a female counselor voice).
   * Merged into `Conversation.startSession` alongside `signedUrl` / `dynamicVariables`.
   */
  conversationOverrides?: NonNullable<BaseSessionConfig['overrides']>;
};

const PULSE_STYLE = `
@keyframes pvs-breathe { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.08); opacity: 1; } }
@keyframes pvs-pulse-ring { 0% { transform: scale(0.95); opacity: 0.6; } 70% { transform: scale(1.15); opacity: 0; } 100% { transform: scale(1.15); opacity: 0; } }
@keyframes pvs-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;

/** Sent with `sendContextualUpdate`; keep in sync with resume-coach session body limits (~6000). */
const LIVE_RESUME_CONTEXT_PREFIX =
  '[Live resume draft updated — treat this as the current draft; the member may have edited text or accepted suggestions.]\n';
const LIVE_RESUME_CONTEXT_MAX_BODY = 5800;

function logVoice(event: string, detail?: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[workforceap:voice] ${event}`, detail ?? '');
  }
}

export default function PortalVoiceSession({
  sessionEndpoint,
  sessionPayload,
  title,
  titleAs = 'h3',
  description,
  accent = '#ad2c4d',
  accentDark = '#8b1f38',
  speakingLabel = 'Assistant is speaking…',
  listeningLabel = 'Listening — speak when ready',
  suggestionsEndpoint,
  completionEndpoint,
  completionPayload,
  onAcceptSuggestion,
  onPostSessionSuggestions,
  delegatePostSessionSuggestions = false,
  onPostSessionParsingChange,
  onTranscriptChunk,
  onPhaseChange,
  retryWithoutDynamicVariables = true,
  pushLiveResumeDraftContext = false,
  showLiveTranscript = true,
  liveTranscriptCoachLabel = 'Coach',
  liveTranscriptYouLabel = 'You',
  acquireVideoForRecording = false,
  optionalCameraForRecording = false,
  videoStreamRef,
  conversationOverrides,
  checkpointEndpoint,
  checkpointIntervalMs = 30000,
}: PortalVoiceSessionProps) {
  const [phase, setPhase] = useState<Phase>('pre');
  const [voiceError, setVoiceError] = useState('');
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [liveLines, setLiveLines] = useState<Array<{ speaker: 'agent' | 'user'; text: string }>>([]);
  const [suggestions, setSuggestions] = useState<ResumeSuggestion[]>([]);
  const [parsingSuggestions, setParsingSuggestions] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const convRef = useRef<Conversation | null>(null);
  const intentionalRef = useRef(false);
  const transcriptRef = useRef<Array<{ speaker: string; text: string }>>([]);
  const phaseRef = useRef<Phase>('pre');
  const voiceErrorRef = useRef('');
  const disconnectIssueRef = useRef(false);
  const lastLiveDraftSentRef = useRef<string | null>(null);
  const completionPostedRef = useRef(false);
  const checkpointPostedRef = useRef(false);
  /** Auto-save timer handle */
  const autoSaveTimerRef = useRef<number | null>(null);
  const sessionPayloadRef = useRef(sessionPayload);
  sessionPayloadRef.current = sessionPayload;
  /** Scroll container for live transcript — never use scrollIntoView (it scrolls the whole page). */
  const liveTranscriptScrollRef = useRef<HTMLDivElement | null>(null);
  /** User scrolled up inside the transcript → do not auto-follow new lines until they scroll back to bottom. */
  const liveTranscriptStickBottomRef = useRef(true);

  const onLiveTranscriptScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    liveTranscriptStickBottomRef.current = nearBottom;
  }, []);

  function stopVideoRecordingStream() {
    if (!videoStreamRef) return;
    const s = videoStreamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
  }

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
      stopVideoRecordingStream();
    };
  }, []);

  // Only clear when fully idle or finished — not during `connecting` (would race with draft sync).
  useEffect(() => {
    if (phase === 'pre' || phase === 'done') {
      lastLiveDraftSentRef.current = null;
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    } else if (phase === 'active' && checkpointEndpoint) {
      // Start auto-save timer
      if (!autoSaveTimerRef.current) {
        autoSaveTimerRef.current = window.setInterval(() => {
          void persistCheckpointTranscript();
        }, checkpointIntervalMs);
      }
    }
  }, [phase]);

  useEffect(() => {
    if (!showLiveTranscript || liveLines.length === 0) return;
    const el = liveTranscriptScrollRef.current;
    if (!el || !liveTranscriptStickBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [liveLines, showLiveTranscript]);

  useEffect(() => {
    if (phase !== 'active' || !pushLiveResumeDraftContext) return;

    const draft =
      typeof sessionPayload?.liveResumeDraft === 'string' ? sessionPayload.liveResumeDraft : '';

    if (lastLiveDraftSentRef.current === null) {
      const conv = convRef.current;
      if (conv) {
        const body = draft.trim()
          ? `${LIVE_RESUME_CONTEXT_PREFIX}${draft.slice(0, LIVE_RESUME_CONTEXT_MAX_BODY)}`
          : '[Live resume draft updated — the live draft is now empty.]';
        try {
          conv.sendContextualUpdate(body);
          lastLiveDraftSentRef.current = draft;
          logVoice('live_resume_context_initial_effect', { len: body.length });
        } catch (e) {
          logVoice('live_resume_context_initial_effect_failed', e);
        }
      }
      return;
    }

    if (draft === lastLiveDraftSentRef.current) return;

    const DEBOUNCE_MS = 450;

    const t = window.setTimeout(() => {
      const conv = convRef.current;
      if (!conv || phaseRef.current !== 'active') return;
      if (draft === lastLiveDraftSentRef.current) return;

      const body = draft.trim()
        ? `${LIVE_RESUME_CONTEXT_PREFIX}${draft.slice(0, LIVE_RESUME_CONTEXT_MAX_BODY)}`
        : '[Live resume draft updated — the live draft is now empty.]';

      try {
        conv.sendContextualUpdate(body);
        lastLiveDraftSentRef.current = draft;
        logVoice('live_resume_context_update', { len: body.length });
      } catch (e) {
        logVoice('live_resume_context_update_failed', e);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [phase, pushLiveResumeDraftContext, sessionPayload]);

  async function startSession() {
    disconnectIssueRef.current = false;
    completionPostedRef.current = false;
    setVoiceError('');
    setLiveLines([]);
    liveTranscriptStickBottomRef.current = true;
    setPhase('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      logVoice('mic_denied');
      setVoiceError('Microphone: access is required. Allow it in your browser and try again.');
      setPhase('pre');
      return;
    }

    if (acquireVideoForRecording && videoStreamRef) {
      let vs: MediaStream | null = null;
      try {
        vs = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        try {
          vs = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch {
          /* handled below */
        }
      }
      if (vs) {
        videoStreamRef.current = vs;
      } else {
        logVoice('camera_denied', { optional: optionalCameraForRecording });
        if (!optionalCameraForRecording) {
          setVoiceError(
            'Camera: access is required for recording. Allow it in your browser and try again.'
          );
          setPhase('pre');
          return;
        }
        videoStreamRef.current = null;
      }
    }

    let signedUrl: string;
    let dynamicVariables: Record<string, string | number | boolean> | undefined;
    try {
      const res = await fetch(sessionEndpoint, {
        method: 'POST',
        credentials: 'include',
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
      logVoice('signed_url_ok', {
        hasDynamicVariables: Boolean(
          dynamicVariables && Object.keys(dynamicVariables).length > 0
        ),
      });
    } catch (err) {
      logVoice('signed_url_failed', err);
      stopVideoRecordingStream();
      setVoiceError(
        `Server: ${err instanceof Error ? err.message : 'Could not start session.'}`
      );
      setPhase('pre');
      return;
    }

    const pushInitialLiveResumeDraft = (conv: Conversation) => {
      if (!pushLiveResumeDraftContext) return;
      const draft =
        typeof sessionPayloadRef.current?.liveResumeDraft === 'string'
          ? sessionPayloadRef.current.liveResumeDraft
          : '';
      const body = draft.trim()
        ? `${LIVE_RESUME_CONTEXT_PREFIX}${draft.slice(0, LIVE_RESUME_CONTEXT_MAX_BODY)}`
        : '[Live resume draft updated — the live draft is now empty.]';
      try {
        conv.sendContextualUpdate(body);
        lastLiveDraftSentRef.current = draft;
        logVoice('live_resume_context_initial', { len: body.length });
      } catch (e) {
        logVoice('live_resume_context_initial_failed', e);
      }
    };

    const flushLiveResumeDraftAfterConnect = (conv: Conversation) => {
      if (!pushLiveResumeDraftContext) return;
      const draft =
        typeof sessionPayloadRef.current?.liveResumeDraft === 'string'
          ? sessionPayloadRef.current.liveResumeDraft
          : '';
      if (draft === lastLiveDraftSentRef.current) return;
      const body = draft.trim()
        ? `${LIVE_RESUME_CONTEXT_PREFIX}${draft.slice(0, LIVE_RESUME_CONTEXT_MAX_BODY)}`
        : '[Live resume draft updated — the live draft is now empty.]';
      try {
        conv.sendContextualUpdate(body);
        lastLiveDraftSentRef.current = draft;
        logVoice('live_resume_context_after_connect', { len: body.length });
      } catch (e) {
        logVoice('live_resume_context_after_connect_failed', e);
      }
    };

    const sessionCallbacks = {
      onConnect: () => {
        logVoice('session_connected');
        setPhase('active');
        // onConnect may run before `convRef` is assigned; flush after the current stack.
        queueMicrotask(() => {
          const conv = convRef.current;
          if (conv) flushLiveResumeDraftAfterConnect(conv);
        });
      },
      onDisconnect: (details: unknown) => {
        const typed = (details ?? {}) as VoiceDisconnectDetails;
        const disconnectMessage = formatDisconnectReason(typed);
        const startupDisconnect = phaseRef.current === 'connecting';
        const hasExistingError = Boolean(voiceErrorRef.current);
        const shouldSurfaceError =
          !intentionalRef.current &&
          (typed.reason === 'error' || startupDisconnect || hasExistingError);

        logVoice('disconnect', {
          reason: typed.reason,
          message: typed.message,
          closeCode: typed.closeCode,
          phase: phaseRef.current,
        });
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
          stopVideoRecordingStream();
          setPhase('pre');
        } else {
          disconnectIssueRef.current = !intentionalRef.current && typed.reason === 'error';
          setPhase('done');
          // Save checkpoint on unexpected disconnect so transcript isn't lost
          if (!intentionalRef.current && transcriptRef.current.length > 0) {
            void persistCheckpointTranscript();
          }
        }
        intentionalRef.current = false;
        setAgentSpeaking(false);
      },
      onMessage: (event: unknown) => {
        const ev = event as Record<string, unknown>;
        // @elevenlabs/client passes { source, role, message, event_id } — not { type, text }.
        const rawText =
          typeof ev.message === 'string'
            ? ev.message
            : typeof ev.text === 'string'
              ? ev.text
            : '';
        const text = rawText.trim();
        if (!text) return;

        const isAgent =
          ev.role === 'agent' ||
          ev.source === 'ai' ||
          ev.type === 'agent_response';
        const isUser =
          ev.role === 'user' ||
          ev.source === 'user' ||
          ev.type === 'user_transcript';

        if (isAgent) {
          setAgentSpeaking(true);
          transcriptRef.current.push({ speaker: 'agent', text });
          setLiveLines((prev) => [...prev, { speaker: 'agent', text }]);
          onTranscriptChunk?.({ speaker: 'agent', text });
        } else if (isUser) {
          setAgentSpeaking(false);
          transcriptRef.current.push({ speaker: 'user', text });
          setLiveLines((prev) => [...prev, { speaker: 'user', text }]);
          onTranscriptChunk?.({ speaker: 'user', text });
        }
      },
      onError: (msg: unknown, context?: unknown) => {
        logVoice('runtime_error', { msg, context });
        stopVideoRecordingStream();
        const errorText = formatVoiceRuntimeReason(String(msg) || 'Connection error', {
          ...(context as VoiceErrorContext | undefined),
        });
        console.error('[voice] runtime error:', errorText, context);
        setVoiceError(errorText);
        setPhase('pre');
      },
    };

    const hasDynamicVariables = Boolean(
      dynamicVariables && Object.keys(dynamicVariables).length > 0
    );

    try {
      const { Conversation: ConversationClient } = await import('@elevenlabs/client');
      if (hasDynamicVariables) {
        try {
          logVoice('start_attempt', { withDynamicVariables: true });
          const conv = await ConversationClient.startSession({
            signedUrl,
            dynamicVariables,
            ...(conversationOverrides ? { overrides: conversationOverrides } : {}),
            ...sessionCallbacks,
          });
          convRef.current = conv;
          pushInitialLiveResumeDraft(conv);
        } catch (firstErr) {
          logVoice('start_threw_with_dynamic_variables', firstErr);
          if (!retryWithoutDynamicVariables) {
            throw firstErr;
          }
          logVoice('start_retry', { plainSignedUrlOnly: true });
          const conv = await ConversationClient.startSession({
            signedUrl,
            ...(conversationOverrides ? { overrides: conversationOverrides } : {}),
            ...sessionCallbacks,
          });
          convRef.current = conv;
          pushInitialLiveResumeDraft(conv);
        }
      } else {
        logVoice('start_attempt', { plain: true });
        const conv = await ConversationClient.startSession({
          signedUrl,
          ...(conversationOverrides ? { overrides: conversationOverrides } : {}),
          ...sessionCallbacks,
        });
        convRef.current = conv;
        pushInitialLiveResumeDraft(conv);
      }
    } catch (err) {
      logVoice('start_failed_final', err);
      stopVideoRecordingStream();
      setVoiceError(
        `Voice session failed${
          retryWithoutDynamicVariables ? ' (including retry without dynamic variables if applicable)' : ''
        }: ${err instanceof Error ? err.message : String(err)}`
      );
      setPhase('pre');
    }
  }

  async function persistCheckpointTranscript() {
    if (!checkpointEndpoint || transcriptRef.current.length === 0) return;

    const payload = JSON.stringify({
      transcript: transcriptRef.current.map((turn) => ({
        role: turn.speaker === 'agent' ? 'agent' : 'user',
        text: turn.text,
      })),
      toolType: 'career_counselor',
      inputSummary: `${title} checkpoint`,
    });

    try {
      const res = await fetch(checkpointEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (res.ok) {
        checkpointPostedRef.current = true;
        logVoice('checkpoint_saved', { lines: transcriptRef.current.length });
      } else {
        logVoice('checkpoint_failed', { status: res.status });
      }
    } catch (err) {
      logVoice('checkpoint_error', err);
    }
  }

  async function persistCompletionTranscript() {
    if (!completionEndpoint || completionPostedRef.current) return;
    if (transcriptRef.current.length === 0) return;

    const payload = JSON.stringify({
      ...(completionPayload ?? {}),
      transcript: transcriptRef.current.map((turn) => ({
        role: turn.speaker === 'agent' ? 'agent' : 'user',
        text: turn.text,
      })),
    });

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const res = await fetch(completionEndpoint, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });

        if (res.ok) {
          completionPostedRef.current = true;
          return;
        }

        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        console.error(
          `[voice] completion persistence failed (attempt ${attempt}):`,
          data?.error ?? res.statusText
        );
      } catch (err) {
        console.error(`[voice] completion persistence error (attempt ${attempt}):`, err);
      }

      completionPostedRef.current = false;

      if (attempt < 2) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
    }
  }

  async function endSession() {
    intentionalRef.current = true;
    disconnectIssueRef.current = false;
    convRef.current?.endSession();
    setPhase('done');
    setAgentSpeaking(false);

    await persistCompletionTranscript();

    // Parse suggestions from transcript
    if (suggestionsEndpoint && transcriptRef.current.length > 0) {
      setParsingSuggestions(true);
      onPostSessionParsingChange?.(true);
      try {
        const res = await fetch(suggestionsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: transcriptRef.current }),
        });
        if (res.ok) {
          const data = (await res.json()) as { suggestions: ResumeSuggestion[] };
          const list = data.suggestions ?? [];
          if (delegatePostSessionSuggestions && onPostSessionSuggestions) {
            onPostSessionSuggestions(list);
            setSuggestions([]);
          } else {
            setSuggestions(list);
          }
        }
      } catch (err) {
        console.error('[suggestion-parse]', err);
      } finally {
        setParsingSuggestions(false);
        onPostSessionParsingChange?.(false);
      }
    }
  }

  function reset() {
    intentionalRef.current = true;
    disconnectIssueRef.current = false;
    convRef.current?.endSession();
    convRef.current = null;
    intentionalRef.current = false;
    stopVideoRecordingStream();
    setPhase('pre');
    setVoiceError('');
    setAgentSpeaking(false);
    setSuggestions([]);
    setDismissed(new Set());
    completionPostedRef.current = false;
    checkpointPostedRef.current = false;
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    transcriptRef.current = [];
    setLiveLines([]);
  }

  const bgSoft = `${accent}14`;

  // UX: Detect empty/disconnected transcript and warn the user
  const transcriptWasEmpty = phase === 'done' && transcriptRef.current.length === 0;
  const hadConnectionIssue = phase === 'done' && disconnectIssueRef.current;

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
        {titleAs === 'h2' ? (
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.5rem', textAlign: 'center' }}>
            {title}
          </h2>
        ) : (
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.5rem', textAlign: 'center' }}>
            {title}
          </h3>
        )}
        <p style={{ color: 'var(--color-on-surface-variant)', textAlign: 'center', marginBottom: '1.25rem', lineHeight: 1.55, fontSize: '0.9rem' }}>
          {description}
        </p>
        {voiceError ? (
          <div
            style={{
              background: 'var(--surface-container-high)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              color: 'var(--color-on-surface)',
              fontWeight: 600,
            }}
          >
            <span style={{ color: 'var(--color-accent)', marginRight: '0.5rem' }}>⚠</span>
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

        {showLiveTranscript ? (
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            style={{
              marginBottom: '1.25rem',
              borderRadius: 12,
              border: '1px solid var(--outline-variant)',
              background: 'linear-gradient(180deg, var(--surface-container-low) 0%, var(--surface-container-lowest) 100%)',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div
              style={{
                padding: '0.5rem 0.75rem',
                borderBottom: '1px solid var(--outline-variant)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                Live transcript
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-on-surface-variant)', opacity: 0.85 }}>
                Powered by ElevenLabs
              </span>
            </div>
            <div
              ref={liveTranscriptScrollRef}
              onScroll={onLiveTranscriptScroll}
              style={{
                maxHeight: 220,
                overflowY: 'auto',
                padding: '0.65rem 0.75rem 0.75rem',
                fontSize: '0.84rem',
                lineHeight: 1.45,
              }}
            >
              {liveLines.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>
                  {agentSpeaking
                    ? 'Coach is speaking — text will appear here.'
                    : 'Waiting for speech — your words will show up as you talk.'}
                </p>
              ) : (
                liveLines.map((line, i) => {
                  const isAgent = line.speaker === 'agent';
                  return (
                    <div
                      key={`${line.speaker}-${i}-${line.text.slice(0, 24)}`}
                      style={{
                        marginBottom: i < liveLines.length - 1 ? '0.65rem' : 0,
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'flex-start',
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: isAgent ? accent : 'var(--color-on-surface-variant)',
                          minWidth: '3.25rem',
                          marginTop: '0.15rem',
                        }}
                      >
                        {isAgent ? liveTranscriptCoachLabel : liveTranscriptYouLabel}
                      </span>
                      <span
                        style={{
                          color: 'var(--color-on-surface)',
                          wordBreak: 'break-word',
                          borderLeft: `2px solid ${isAgent ? `${accent}55` : 'var(--outline-variant)'}`,
                          paddingLeft: '0.5rem',
                        }}
                      >
                        {line.text}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

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
        {/* UX CLARITY: Warn when no transcript was captured due to disconnect or error */}
        {transcriptWasEmpty || hadConnectionIssue ? (
          <div
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              color: '#b91c1c',
              textAlign: 'left',
            }}
          >
            <strong>Session ended with no conversation recorded.</strong>
            <p style={{ margin: '0.25rem 0 0', lineHeight: 1.4 }}>
              {hadConnectionIssue
                ? 'The connection was interrupted. Your microphone may not have transmitted audio, or the voice service may have disconnected unexpectedly.'
                : 'No audio was captured during this session. Check that your microphone is working and try again.'}
            </p>
          </div>
        ) : (
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Session ended.
          </p>
        )}
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
