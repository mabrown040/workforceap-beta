'use client';

import { useState, useCallback } from 'react';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import InterviewCoachingPanel from '@/components/portal/tools/InterviewCoachingPanel';
import BrowserSpeechCaptions from '@/components/portal/tools/BrowserSpeechCaptions';

const INTERVIEW_TYPES = ['Behavioral', 'Technical', 'General'] as const;

/**
 * Dedicated voice mock-interview entry: role + style, ElevenLabs session, live coaching panel.
 */
export default function VoiceInterviewScaffold() {
  const [role, setRole] = useState('');
  const [interviewType, setInterviewType] = useState<(typeof INTERVIEW_TYPES)[number]>('Behavioral');
  const [ready, setReady] = useState(false);
  const [lastUserText, setLastUserText] = useState('');

  const onTranscriptChunk = useCallback((chunk: { speaker: 'agent' | 'user'; text: string }) => {
    if (chunk.speaker === 'user') setLastUserText(chunk.text);
  }, []);

  const canStart = role.trim().length > 0;

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
              Mock interview for <strong>{role}</strong> ({interviewType}). Use a quiet space and allow microphone access.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <BrowserSpeechCaptions active={ready} />
            </div>
            <PortalVoiceSession
              sessionEndpoint="/api/member/voice-interview/session"
              sessionPayload={{ role: role.trim(), interviewType }}
              title="Voice mock interview"
              description="Answer out loud. The coach will listen and respond like a real interviewer."
              accent="#0f766e"
              accentDark="#115e59"
              speakingLabel="Interviewer is speaking…"
              listeningLabel="Your turn — take your time"
              onTranscriptChunk={onTranscriptChunk}
            />
            <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: '1rem' }} onClick={() => { setReady(false); setLastUserText(''); }}>
              Change role / style
            </button>
          </div>
          <InterviewCoachingPanel targetRole={role} lastUserText={lastUserText} />
        </div>
      )}
    </div>
  );
}
