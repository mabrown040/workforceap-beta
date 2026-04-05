'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import type { ResumeSuggestion, VoiceSessionPhase } from '@/components/portal/PortalVoiceSession';
import { extractResumeCoachSuggestionsFromText } from '@/lib/ai/resumeCoachHeuristic';
import { resumeCoachVoiceSurface } from '@/lib/portal/voiceAgentSurfaces';

type LiveSuggestion = ResumeSuggestion & { id: string };

function newSuggestionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Renders the draft with one pending swap highlighted: strikethrough original + proposed text (not applied until approved).
 */
function ResumeDraftPendingPreview({
  resumeText,
  original,
  suggested,
}: {
  resumeText: string;
  original: string;
  suggested: string;
}) {
  const idx = resumeText.indexOf(original);
  if (idx === -1) {
    return (
      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-on-surface-variant)' }}>
        That phrase is no longer in your draft — edit the text below or dismiss this suggestion.
      </p>
    );
  }
  return (
    <div
      role="region"
      aria-label="Preview of suggested edit in your draft"
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: 'ui-monospace, monospace',
        fontSize: '0.82rem',
        lineHeight: 1.55,
        padding: '0.75rem',
        borderRadius: '0.5rem',
        border: '2px solid rgba(37, 99, 235, 0.45)',
        background: 'var(--surface-container-low)',
        maxHeight: 'min(42vh, 340px)',
        overflow: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {resumeText.slice(0, idx)}
      <mark
        style={{
          background: 'rgba(239, 68, 68, 0.22)',
          textDecoration: 'line-through',
          color: 'var(--color-on-surface)',
          padding: '0 2px',
        }}
      >
        {original}
      </mark>
      <mark
        style={{
          background: 'rgba(34, 197, 94, 0.35)',
          color: 'var(--color-on-surface)',
          fontWeight: 600,
          padding: '0 2px',
        }}
      >
        {suggested}
      </mark>
      {resumeText.slice(idx + original.length)}
    </div>
  );
}

/**
 * Coordinates voice coach suggestions → live text editor.
 * Hydrates from extracted stored resume on mount.
 * Accept: in-place replace when `original` matches the editor text; otherwise appends a note block.
 * Layout: side-by-side on desktop (resume left, voice coach right), stacked on mobile.
 */
export default function ResumeCoachWorkspace() {
  const [resumeText, setResumeText] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [liveCoachSuggestions, setLiveCoachSuggestions] = useState<LiveSuggestion[]>([]);
  const agentSpeechBufRef = useRef('');
  const suggestionKeySeenRef = useRef<Set<string>>(new Set());
  const heuristicDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate editor from stored resume on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/member/resume?includePlainText=1')
      .then((r) => r.json())
      .then((d: { resumePlainText?: string | null }) => {
        if (cancelled) return;
        const t = d.resumePlainText?.trim();
        if (t) {
          setResumeText((prev) => (prev.trim() ? prev : t));
        }
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pass live draft to the coach session as context
  const sessionPayload = useMemo(() => ({ liveResumeDraft: resumeText }), [resumeText]);

  const handleAccept = useCallback((s: ResumeSuggestion) => {
    setResumeText((prev) => {
      const o = s.original?.trim();
      if (o && prev.includes(o)) {
        return prev.replace(o, s.suggested);
      }
      const line = s.original
        ? `[Change] "${s.original}" → "${s.suggested}" (${s.context})`
        : `[Add] ${s.suggested} (${s.context})`;
      return prev.trim()
        ? `${prev}\n\n--- Coach suggestion (accepted) ---\n${line}`
        : `--- Coach suggestion (accepted) ---\n${line}`;
    });
  }, []);

  const activeInlineSuggestion = useMemo(() => {
    for (const s of liveCoachSuggestions) {
      const o = s.original?.trim();
      if (o && resumeText.includes(o)) return s;
    }
    return null;
  }, [liveCoachSuggestions, resumeText]);

  const queuedCardSuggestions = useMemo(
    () =>
      liveCoachSuggestions.filter((s) => !activeInlineSuggestion || s.id !== activeInlineSuggestion.id),
    [liveCoachSuggestions, activeInlineSuggestion]
  );

  const flushAgentHeuristic = useCallback(() => {
    const text = agentSpeechBufRef.current;
    if (!text.trim()) return;
    const found = extractResumeCoachSuggestionsFromText(text);
    if (found.length === 0) return;
    setLiveCoachSuggestions((prev) => {
      const out = [...prev];
      for (const s of found) {
        const key = `${s.original ?? ''}→${s.suggested}`;
        if (suggestionKeySeenRef.current.has(key)) continue;
        suggestionKeySeenRef.current.add(key);
        out.push({ ...s, id: newSuggestionId() });
      }
      return out;
    });
  }, []);

  const onTranscriptChunk = useCallback(
    (chunk: { speaker: 'agent' | 'user'; text: string }) => {
      if (chunk.speaker !== 'agent') return;
      agentSpeechBufRef.current = `${agentSpeechBufRef.current} ${chunk.text}`.trim().slice(-6000);
      if (heuristicDebounceRef.current) clearTimeout(heuristicDebounceRef.current);
      heuristicDebounceRef.current = setTimeout(() => {
        heuristicDebounceRef.current = null;
        flushAgentHeuristic();
      }, 500);
    },
    [flushAgentHeuristic]
  );

  const onVoicePhaseChange = useCallback((p: VoiceSessionPhase) => {
    if (p === 'pre' || p === 'connecting') {
      agentSpeechBufRef.current = '';
      suggestionKeySeenRef.current.clear();
      setLiveCoachSuggestions([]);
      if (heuristicDebounceRef.current) {
        clearTimeout(heuristicDebounceRef.current);
        heuristicDebounceRef.current = null;
      }
    }
  }, []);

  const dismissSuggestion = useCallback((id: string) => {
    setLiveCoachSuggestions((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        gap: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        marginTop: '1.5rem',
      }}
    >
      {/* Top/Left panel: Voice coach */}
      <div style={{ flex: '1 1 300px', minWidth: 280 }}>
        <VoiceAgentSurface
          {...resumeCoachVoiceSurface}
          subtext="Voice feedback on bullets and framing. Your live draft syncs during the call — approve edits inline."
        >
          <PortalVoiceSession
            sessionEndpoint="/api/member/resume-coach/session"
            sessionPayload={sessionPayload}
            retryWithoutDynamicVariables={false}
            pushLiveResumeDraftContext
            suggestionsEndpoint="/api/member/resume-coach/parse-suggestions"
            title="Talk through your resume"
            description="Practice your pitch, discuss experience bullets, or get advice on framing your background."
            accent="#2563eb"
            accentDark="#1d4ed8"
            speakingLabel="Coach is speaking…"
            listeningLabel="Listening — describe your background"
            onAcceptSuggestion={handleAccept}
            onTranscriptChunk={onTranscriptChunk}
            onPhaseChange={onVoicePhaseChange}
          />
        </VoiceAgentSurface>
      </div>

      {/* Bottom/Right panel: Live resume draft (context textarea) */}
      <div style={{ flex: '1 1 300px', minWidth: 280 }}>
        <div
          className="stitch-card"
          style={{ padding: '1.5rem', border: '1px solid var(--outline-variant)' }}
        >
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Live Resume Draft</h4>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {hydrated
              ? 'Edits here sync to the coach during the call. When the coach proposes a swap, it appears highlighted below — approve or decline before it is written into the draft.'
              : 'Loading your resume…'}
          </p>

          {hydrated && activeInlineSuggestion?.original?.trim() ? (
            <div style={{ marginBottom: '1rem' }}>
              <p
                style={{
                  margin: '0 0 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                Pending change (in session)
              </p>
              <ResumeDraftPendingPreview
                resumeText={resumeText}
                original={activeInlineSuggestion.original!.trim()}
                suggested={activeInlineSuggestion.suggested}
              />
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    handleAccept(activeInlineSuggestion);
                    dismissSuggestion(activeInlineSuggestion.id);
                  }}
                >
                  Approve change
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => dismissSuggestion(activeInlineSuggestion.id)}
                >
                  Disapprove
                </button>
              </div>
            </div>
          ) : null}

          {hydrated && queuedCardSuggestions.length > 0 ? (
            <div
              style={{
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                {activeInlineSuggestion ? 'Other suggestions' : 'Live — apply to draft'}
              </p>
              {queuedCardSuggestions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid var(--outline-variant)',
                    borderRadius: 10,
                    padding: '0.65rem 0.75rem',
                    background: 'var(--surface-container-low)',
                  }}
                >
                  {s.original ? (
                    <p
                      style={{
                        margin: '0 0 0.35rem',
                        fontSize: '0.78rem',
                        color: 'var(--color-on-surface-variant)',
                      }}
                    >
                      <span style={{ textDecoration: 'line-through' }}>{s.original}</span>
                      {' → '}
                      <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                        {s.suggested}
                      </span>
                    </p>
                  ) : (
                    <p style={{ margin: '0 0 0.35rem', fontSize: '0.82rem' }}>{s.suggested}</p>
                  )}
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>
                    {s.context}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        handleAccept(s);
                        dismissSuggestion(s.id);
                      }}
                    >
                      Apply to draft
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => dismissSuggestion(s.id)}>
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {hydrated ? (
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={18}
              placeholder="Your resume will appear here…"
              aria-label="Live resume draft"
              style={{
                width: '100%',
                resize: 'vertical',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.82rem',
                lineHeight: 1.55,
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--outline-variant)',
                background: 'var(--surface-container-low)',
                color: 'var(--color-on-surface)',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <div
              style={{
                height: 200,
                background: 'var(--surface-container)',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-on-surface-variant)',
                fontSize: '0.875rem',
              }}
            >
              Loading…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
