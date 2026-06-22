'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ToolFollowThrough from './ToolFollowThrough';
import PortalVoiceSessionLazy from '@/components/portal/PortalVoiceSessionLazy';
import type { VoiceSessionPhase } from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { mockInterviewVoiceSurface } from '@/lib/portal/voice';
import InterviewCoachingPanel from '@/components/portal/tools/InterviewCoachingPanel';
import MockInterviewVideoRecorder from '@/components/portal/tools/MockInterviewVideoRecorder';
import AiToolLanguageSelector, { type AiToolLanguage } from '@/components/portal/tools/AiToolLanguageSelector';

const INTERVIEW_TYPES = ['Behavioral', 'Technical', 'General'] as const;
const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry-level (0–2 years)' },
  { value: 'mid', label: 'Mid-level (3–7 years)' },
  { value: 'senior', label: 'Senior / Lead (8+ years)' },
] as const;

/**
 * Dedicated voice mock-interview entry: role + style, ElevenLabs session, live coaching panel.
 * Optional WebRTC camera+audio recording (uploaded to private storage; short-lived download link).
 */
export default function VoiceInterviewScaffold() {
  const [role, setRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'entry' | 'mid' | 'senior'>('entry');
  const [interviewType, setInterviewType] = useState<(typeof INTERVIEW_TYPES)[number]>('Behavioral');
  const [language, setLanguage] = useState<AiToolLanguage>('en');
  const [ready, setReady] = useState(false);
  const [lastUserText, setLastUserText] = useState('');
  const [voicePhase, setVoicePhase] = useState<VoiceSessionPhase>('pre');
  const [recordVideo, setRecordVideo] = useState(false);
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [videoErr, setVideoErr] = useState('');
  const [cameraPriming, setCameraPriming] = useState(false);
  /** Fresh mount for each run so voice UI state resets reliably after “Change role / style”. */
  const [voiceSessionKey, setVoiceSessionKey] = useState(0);
  const [sessionId, setSessionId] = useState('');
  const videoStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!ready) {
      setVoicePhase('pre');
      setPlaybackUrl(null);
    } else {
      setVideoErr('');
    }
  }, [ready]);

  useEffect(() => {
    if (!ready) setVideoErr('');
  }, [recordVideo, recordingConsent, ready]);

  const onTranscriptChunk = useCallback((chunk: { speaker: 'agent' | 'user'; text: string }) => {
    if (chunk.speaker === 'user') setLastUserText(chunk.text);
  }, []);

  const wantRecording = recordVideo && recordingConsent;
  const canStart = role.trim().length > 0 && (!recordVideo || recordingConsent);
  const needsConsentForCamera = recordVideo && !recordingConsent && role.trim().length > 0;

  const enterVoiceSession = useCallback(() => {
    setVideoErr('');
    setCameraPriming(false);
    setVoiceSessionKey((k) => k + 1);
    setSessionId(`voice-interview-${Date.now()}`);
    setReady(true);
  }, []);

  return (
    <div>
      {!ready ? (
        <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', marginBottom: '1.25rem', borderRadius: 12 }}>
          <AiToolLanguageSelector value={language} onChange={setLanguage} />
          <div className="form-group">
            <label htmlFor="vi-role">Target role</label>
            <input
              id="vi-role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. IT Support Specialist"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="vi-level">Experience level</label>
            <select
              id="vi-level"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as 'entry' | 'mid' | 'senior')}
            >
              {EXPERIENCE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="vi-type">Interview style</label>
            <select
              id="vi-type"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value as (typeof INTERVIEW_TYPES)[number])}
            >
              {INTERVIEW_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div
            className="form-group"
            style={{
              padding: '0.75rem 0',
              borderTop: '1px solid var(--outline-variant, #e8e0dd)',
              marginTop: '0.5rem',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={recordVideo}
                onChange={(e) => {
                  setRecordVideo(e.target.checked);
                  if (!e.target.checked) setRecordingConsent(false);
                }}
              />
              Record my camera during the session (your voice is captured by the interview session)
            </label>
            <p style={{ margin: '0.35rem 0 0 1.5rem', fontSize: '0.82rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.45 }}>
              Saves a practice video to your secure WorkforceAP storage so you can review your delivery. Authorized staff may
              access recordings only to support your coaching (same retention practices as your resume file).
            </p>
            {recordVideo ? (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  marginTop: '0.75rem',
                  marginLeft: '0.1rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={recordingConsent}
                  onChange={(e) => setRecordingConsent(e.target.checked)}
                />
                <span style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
                  I understand the recording includes my voice and image, is stored encrypted, and is used for my career
                  development as described above.
                </span>
              </label>
            ) : null}
            {needsConsentForCamera ? (
              <p
                role="status"
                style={{
                  margin: '0.75rem 0 0',
                  fontSize: '0.82rem',
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                }}
              >
                Check the consent box above to continue with camera recording, or turn off “Record my camera” for voice
                only.
              </p>
            ) : null}
          </div>

          {videoErr && !ready ? (
            <div
              role="alert"
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: 8,
                background: 'color-mix(in srgb, #b91c1c 8%, transparent)',
                border: '1px solid color-mix(in srgb, #b91c1c 35%, transparent)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                color: 'var(--color-on-surface)',
              }}
            >
              <p style={{ margin: '0 0 0.65rem' }}>{videoErr}</p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  videoStreamRef.current?.getTracks().forEach((t) => t.stop());
                  videoStreamRef.current = null;
                  setRecordVideo(false);
                  setRecordingConsent(false);
                  setVideoErr('');
                  enterVoiceSession();
                }}
              >
                Continue with voice only (no camera recording)
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="btn btn-primary"
            disabled={!canStart || cameraPriming}
            onClick={() => {
              void (async () => {
                setVideoErr('');
                setCameraPriming(true);
                videoStreamRef.current?.getTracks().forEach((t) => t.stop());
                videoStreamRef.current = null;

                try {
                  if (wantRecording) {
                    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
                    const gum = md?.getUserMedia?.bind(md);
                    if (!gum) {
                      setVideoErr(
                        'Camera is not available in this browser or context (use HTTPS or turn off camera recording). You can continue with voice only below.'
                      );
                      return;
                    }
                    try {
                      const vs = await gum({
                        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                        audio: false,
                      });
                      videoStreamRef.current = vs;
                    } catch {
                      try {
                        videoStreamRef.current = await gum({
                          video: true,
                          audio: false,
                        });
                      } catch {
                        setVideoErr(
                          'Camera access was blocked or unavailable. Allow camera for this site in your browser settings, or turn off “Record my camera” and try again—or continue with voice only below.'
                        );
                        return;
                      }
                    }
                  }

                  enterVoiceSession();
                } catch (e) {
                  console.error('[VoiceInterviewScaffold] start failed', e);
                  setVideoErr(
                    'Something went wrong starting the session. Try “Continue with voice only” below, or refresh the page.'
                  );
                } finally {
                  setCameraPriming(false);
                }
              })();
            }}
          >
            {cameraPriming && wantRecording ? 'Requesting camera…' : 'Continue to voice session'}
          </button>
        </div>
      ) : (
        <div className="voice-interview-layout">
          <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', borderRadius: 12 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
              Mock interview for <strong>{role}</strong> ({interviewType}). Use a quiet space and allow <strong>microphone</strong> access to talk with the coach.
              {wantRecording ? (
                <>
                  {' '}
                  If you opted in below, your browser will ask for <strong>camera</strong> when the session starts so we
                  can save a practice video — you can still do a voice-only interview without recording.
                </>
              ) : null}
            </p>
            {wantRecording ? (
              <MockInterviewVideoRecorder
                wantRecording={wantRecording}
                phase={voicePhase}
                role={role.trim()}
                interviewType={interviewType}
                externalStreamRef={videoStreamRef}
                onUploadComplete={({ playbackUrl: u }) => setPlaybackUrl(u)}
                onError={(m) => setVideoErr(m)}
              />
            ) : null}
            {videoErr ? (
              <p style={{ color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{videoErr}</p>
            ) : null}
            <VoiceAgentSurface {...mockInterviewVoiceSurface}>
              <PortalVoiceSessionLazy
                key={voiceSessionKey}
                sessionEndpoint="/api/member/voice-interview/session"
                sessionPayload={{ role: role.trim(), interviewType, experienceLevel, language }}
                completionEndpoint="/api/member/voice-interview/transcript"
                completionPayload={{ sessionId, role: role.trim(), interviewType }}
                title="Voice mock interview"
                description="Answer out loud. The coach will listen and respond like a real interviewer."
                accent="#ad2c4d"
                accentDark="#8b1f38"
                speakingLabel="Interviewer is speaking…"
                listeningLabel="Your turn — take your time"
                liveTranscriptCoachLabel="Interviewer"
                onTranscriptChunk={onTranscriptChunk}
                onPhaseChange={setVoicePhase}
                acquireVideoForRecording={false}
                optionalCameraForRecording={false}
                videoStreamRef={videoStreamRef}
              />
            </VoiceAgentSurface>
            {playbackUrl ? (
              <p style={{ marginTop: '1rem', fontSize: '0.88rem' }}>
                <a
                  href={playbackUrl}
                  download="mock-interview-recording.webm"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 600, color: 'var(--color-accent)' }}
                >
                  Download your practice recording
                </a>{' '}
                <span style={{ color: 'var(--color-on-surface-variant)' }}>(link expires in about an hour)</span>
              </p>
            ) : null}
            <ToolFollowThrough toolType="voice_interview" />
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginTop: '1rem' }}
              onClick={() => {
                videoStreamRef.current?.getTracks().forEach((t) => t.stop());
                videoStreamRef.current = null;
                setVoiceSessionKey((k) => k + 1);
                setReady(false);
                setLastUserText('');
                setPlaybackUrl(null);
                setVideoErr('');
                setVoicePhase('pre');
              }}
            >
              Change role / style
            </button>
          </div>
          <InterviewCoachingPanel targetRole={role} lastUserText={lastUserText} />
        </div>
      )}
    </div>
  );
}
