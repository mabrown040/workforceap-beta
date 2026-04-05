'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import type { ResumeSuggestion, VoiceSessionPhase } from '@/components/portal/PortalVoiceSession';
import { extractResumeCoachSuggestionsFromText } from '@/lib/ai/resumeCoachHeuristic';

/**
 * Coordinates voice coach suggestions → live text editor.
 * Hydrates from extracted stored resume on mount.
 * Accept: in-place replace when `original` matches the editor text; otherwise appends a note block.
 * Layout: side-by-side on desktop (resume left, voice coach right), stacked on mobile.
 */
export default function ResumeCoachWorkspace() {
  const [resumeText, setResumeText] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [liveCoachSuggestions, setLiveCoachSuggestions] = useState<ResumeSuggestion[]>([]);
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
    return () => { cancelled = true; };
  }, []);

  // Pass live draft to the coach session as context
  const sessionPayload = useMemo(() => ({ liveResumeDraft: resumeText }), [resumeText]);

  const handleAccept = useCallback((s: ResumeSuggestion) => {
    setResumeText((prev) => {
      const o = s.original?.trim();
      if (o && prev.includes(o)) {
        // In-place replace — user sees the change right where it is
        return prev.replace(o, s.suggested);
      }
      // Fallback: append labeled block
      const line = s.original
        ? `[Change] "${s.original}" → "${s.suggested}" (${s.context})`
        : `[Add] ${s.suggested} (${s.context})`;
      return prev.trim()
        ? `${prev}\n\n--- Coach suggestion (accepted) ---\n${line}`
        : `--- Coach suggestion (accepted) ---\n${line}`;
    });
  }, []);

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
        out.push(s);
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
        <div
          className="stitch-card"
          style={{ padding: '1.5rem', border: '1px solid var(--outline-variant)' }}
        >
          <h2
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-on-surface-variant)',
              marginBottom: '1rem',
            }}
          >
            Resume Coach (Voice)
          </h2>
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
        </div>
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
              ? 'Edits you type here sync to the coach. When the coach says a clear swap (e.g. change \'old\' to \'new\'), use Apply below. More suggestions appear after you end the session.'
              : 'Loading your resume…'}
          </p>
          {hydrated && liveCoachSuggestions.length > 0 ? (
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
                Live — apply to draft
              </p>
              {liveCoachSuggestions.map((s, i) => (
                <div
                  key={`${s.original ?? 'x'}-${s.suggested}-${i}`}
                  style={{
                    border: '1px solid var(--outline-variant)',
                    borderRadius: 10,
                    padding: '0.65rem 0.75rem',
                    background: 'var(--surface-container-low)',
                  }}
                >
                  {s.original ? (
                    <p style={{ margin: '0 0 0.35rem', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                      <span style={{ textDecoration: 'line-through' }}>{s.original}</span>
                      {' → '}
                      <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{s.suggested}</span>
                    </p>
                  ) : (
                    <p style={{ margin: '0 0 0.35rem', fontSize: '0.82rem' }}>{s.suggested}</p>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '0.25rem' }}
                    onClick={() => {
                      handleAccept(s);
                      setLiveCoachSuggestions((prev) => prev.filter((_, j) => j !== i));
                    }}
                  >
                    Apply to draft
                  </button>
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
              style={{
                width: '100%',
                resize: 'vertical',
                fontFamily: 'monospace',
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
            <div style={{
              height: 200,
              background: 'var(--surface-container)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-on-surface-variant)',
              fontSize: '0.875rem',
            }}>
              Loading…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
