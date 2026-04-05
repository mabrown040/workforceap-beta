'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import PortalVoiceSession, { type VoiceSessionPhase } from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { mockInterviewVoiceSurface } from '@/lib/portal/voiceAgentSurfaces';
import InterviewCoachingPanel from '@/components/portal/tools/InterviewCoachingPanel';
import MockInterviewVideoRecorder from '@/components/portal/tools/MockInterviewVideoRecorder';

const INTERVIEW_TYPES = ['Behavioral', 'Technical', 'General'] as const;

/**
 * Dedicated voice mock-interview entry: role + style, ElevenLabs session, live coaching panel.
 * Optional WebRTC camera+audio recording (uploaded to private storage; short-lived download link).
 */
export default function VoiceInterviewScaffold() {
  const [role, setRole] = useState('');
  const [interviewType, setInterviewType] = useState<(typeof INTERVIEW_TYPES)[number]>('Behavioral');
  const [ready, setReady] = useState(false);
  const [lastUserText, setLastUserText] = useState('');
  const [voicePhase, setVoicePhase] = useState<VoiceSessionPhase>('pre');
  const [recordVideo, setRecordVideo] = useState(false);
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [videoErr, setVideoErr] = useState('');
  const interviewVideoStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!ready) {
      setVoicePhase('pre');
      setPlaybackUrl(null);
    } else {
      setVideoErr('');
    }
  }, [ready]);

  const onTranscriptChunk = useCallback((chunk: { speaker: 'agent' | 'user'; text: string }) => {
    if (chunk.speaker === 'user') setLastUserText(chunk.text);
  }, []);

  const wantRecording = recordVideo && recordingConsent;
  const canStart = role.trim().length > 0 && (!recordVideo || recordingConsent);

  return (
    <div>
      {!ready ? (
        <div className="stitch-card" style={{ padding: '1.25rem', marginBottom: '1.25rem', borderRadius: 12 }}>
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
          </div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={!canStart}
            onClick={() => setReady(true)}
          >
            Continue to voice session
          </button>
        </div>
      ) : (
        <div className="voice-interview-layout">
          <div className="stitch-card" style={{ padding: '1.25rem', borderRadius: 12 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
              Mock interview for <strong>{role}</strong> ({interviewType}). Use a quiet space and allow microphone access
              {wantRecording ? ' and camera access' : ''}.
            </p>
            {wantRecording ? (
              <MockInterviewVideoRecorder
                wantRecording={wantRecording}
                phase={voicePhase}
                role={role.trim()}
                interviewType={interviewType}
                externalStreamRef={interviewVideoStreamRef}
                onUploadComplete={({ playbackUrl: u }) => setPlaybackUrl(u)}
                onError={(m) => setVideoErr(m)}
              />
            ) : null}
            {videoErr ? (
              <p style={{ color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{videoErr}</p>
            ) : null}
            <VoiceAgentSurface {...mockInterviewVoiceSurface}>
              <PortalVoiceSession
                sessionEndpoint="/api/member/voice-interview/session"
                sessionPayload={{ role: role.trim(), interviewType }}
                title="Voice mock interview"
                description="Answer out loud. The coach will listen and respond like a real interviewer."
                accent="#7c3aed"
                accentDark="#5b21b6"
                speakingLabel="Interviewer is speaking…"
                listeningLabel="Your turn — take your time"
                liveTranscriptCoachLabel="Interviewer"
                acquireVideoForRecording={wantRecording}
                videoStreamRef={interviewVideoStreamRef}
                onTranscriptChunk={onTranscriptChunk}
                onPhaseChange={setVoicePhase}
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
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginTop: '1rem' }}
              onClick={() => {
                setReady(false);
                setLastUserText('');
                setPlaybackUrl(null);
                setVideoErr('');
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
