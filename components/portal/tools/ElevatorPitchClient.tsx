'use client';

import { useState, useRef, useEffect } from 'react';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import AiToolLanguageSelector, { type AiToolLanguage } from './AiToolLanguageSelector';
import ToolFollowThrough from './ToolFollowThrough';

type Step = 'form' | 'pitch' | 'rehearse';

export default function ElevatorPitchClient({ initialData }: { initialData?: { name: string; targetRole: string; strengths: string; certifications: string; industry: string } | null }) {
  const [step, setStep] = useState<Step>('form');

  // Form fields
  const [name, setName] = useState(initialData?.name ?? '');
  const [targetRole, setTargetRole] = useState(initialData?.targetRole ?? '');
  const [strengths, setStrengths] = useState(initialData?.strengths ?? '');
  const [certifications, setCertifications] = useState(initialData?.certifications ?? '');
  const [industry, setIndustry] = useState(initialData?.industry ?? '');
  const [language, setLanguage] = useState<AiToolLanguage>('en');

  useDraftAutosave('ai-tool:elevator-pitch:name', name, setName);
  useDraftAutosave('ai-tool:elevator-pitch:targetRole', targetRole, setTargetRole);
  useDraftAutosave('ai-tool:elevator-pitch:strengths', strengths, setStrengths);
  useDraftAutosave('ai-tool:elevator-pitch:certifications', certifications, setCertifications);
  useDraftAutosave('ai-tool:elevator-pitch:industry', industry, setIndustry);

  // Generated pitch
  const [pitch, setPitch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ sent: boolean; error?: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  // Rehearsal recording
  const [recording, setRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetRole.trim()) return;
    setGenerating(true);
    setGenError(null);
    setEmailStatus(null);
    try {
      const res = await fetch('/api/ai/elevator-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, targetRole, strengths, certifications, industry, language }),
      });
      const data = await res.json() as { pitch?: string; error?: string; emailSent?: boolean; emailError?: string };
      if (!res.ok || !data.pitch) { setGenError(data.error ?? 'Could not generate. Try again.'); return; }
      setPitch(data.pitch);
      setEmailStatus({ sent: data.emailSent === true, error: data.emailError ?? null });
      setStep('pitch');
    } catch {
      setGenError('Network error — try again.');
    } finally {
      setGenerating(false);
    }
  };

  const startRehearsal = async () => {
    setRecordingError(null);
    setPlaybackUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      mediaRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setPlaybackUrl(url);
        stream.getTracks().forEach(t => t.stop());
        if (playbackRef.current) { playbackRef.current.src = url; }
      };
      // 3-second countdown then start
      setCountdown(3);
      setStep('rehearse');
      let c = 3;
      countdownRef.current = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(countdownRef.current!);
          setRecording(true);
          mr.start(100);
        }
      }, 1000);
    } catch (e) {
      setRecordingError(e instanceof Error ? e.message : 'Camera/mic not available. Allow access and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
    setRecording(false);
  };

  const resetRehearsal = () => {
    setPlaybackUrl(null);
    setRecording(false);
    setCountdown(0);
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pitch);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  // ── FORM STEP ──────────────────────────────────────────────
  if (step === 'form') {
    return (
      <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <AiToolLanguageSelector value={language} onChange={setLanguage} />
        <div className="portal-card portal-card--gradient-accent" style={{ padding: '1.125rem', borderRadius: '0.875rem', marginBottom: '0.25rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.55 }}>
            <strong>Answer 5 quick questions</strong> and we&rsquo;ll write a 10–20 second elevator statement you can rehearse and record.
          </p>
        </div>

        {[
          { id: 'ep-name', label: 'Your full name', value: name, set: setName, placeholder: 'e.g. Jordan Smith', required: true },
          { id: 'ep-role', label: 'Position you are looking for', value: targetRole, set: setTargetRole, placeholder: 'e.g. IT Support Specialist', required: true },
          { id: 'ep-strengths', label: 'What you excel or are gifted at', value: strengths, set: setStrengths, placeholder: 'e.g. problem-solving, customer service, fast learner' },
          { id: 'ep-certs', label: 'Certifications you have or are working toward', value: certifications, set: setCertifications, placeholder: 'e.g. CompTIA A+, Google IT Support' },
          { id: 'ep-industry', label: 'Industry you are targeting', value: industry, set: setIndustry, placeholder: 'e.g. Healthcare IT, Managed Services' },
        ].map(({ id, label, value, set, placeholder, required }) => (
          <div key={id} className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={id}>{label}{required && <span style={{ color: 'var(--color-accent)', marginLeft: '0.25rem' }}>*</span>}</label>
            <input id={id} type="text" value={value} onChange={e => set(e.target.value)} placeholder={placeholder} required={required} />
          </div>
        ))}

        {genError && <p style={{ color: 'var(--color-accent)', fontSize: '0.875rem', margin: 0 }}>{genError}</p>}

        <button type="submit" className="btn btn-primary" disabled={generating || !name.trim() || !targetRole.trim()}>
          {generating ? (
            <><span className="material-symbols-outlined" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }} aria-hidden="true">progress_activity</span> Writing your pitch…</>
          ) : (
            <><span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">auto_awesome</span> Write My Elevator Pitch</>
          )}
        </button>
      </form>
    );
  }

  // ── PITCH REVIEW STEP ──────────────────────────────────────
  if (step === 'pitch') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="portal-card portal-card--flat" style={{ padding: '1.5rem', borderRadius: '0.875rem' }}>
          <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', margin: '0 0 0.75rem' }}>
            Your Elevator Pitch
          </p>
          <p style={{ fontSize: '1.0625rem', lineHeight: 1.7, color: 'var(--color-on-surface)', margin: 0, fontStyle: 'italic' }}>
            &ldquo;{pitch}&rdquo;
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => void handleCopy()} className="btn btn-outline btn-sm">
              <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }} aria-hidden="true">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </button>
            <button type="button" onClick={() => setStep('form')} className="btn btn-outline btn-sm">Edit answers</button>
          </div>
          <div style={{ marginTop: '1rem' }}>
            {emailStatus?.sent ? (
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-green, #4a9b4f)', fontWeight: 600 }}>
                We emailed this AI elevator speech to you so you can review it later.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                We generated your speech, but email did not send{emailStatus?.error ? `: ${emailStatus.error}` : '.'} Copy it now and try again if needed.
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0 }}>Ready to rehearse?</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.5 }}>
            We&rsquo;ll turn on your camera and mic. Read the speech out loud, watch yourself, and refine the delivery immediately.
          </p>
          <button type="button" onClick={() => void startRehearsal()} className="btn btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">videocam</span>
            Start Rehearsal Recording
          </button>
          {recordingError && <p style={{ color: 'var(--color-accent)', fontSize: '0.875rem', margin: 0 }}>{recordingError}</p>}
        </div>

        <ToolFollowThrough toolType="elevator_pitch" output={pitch} />
      </div>
    );
  }

  // ── REHEARSAL STEP ─────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Pitch prompt card */}
      <div className="portal-card portal-card--gradient-accent" style={{ padding: '1.25rem', borderRadius: '0.875rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', margin: '0 0 0.5rem' }}>
          Read this out loud ↓
        </p>
        <p style={{ fontSize: '1.0625rem', lineHeight: 1.65, color: 'var(--color-on-surface)', margin: 0, fontWeight: 600 }}>
          &ldquo;{pitch}&rdquo;
        </p>
      </div>

      {/* Camera live feed */}
      <div style={{ position: 'relative', borderRadius: '0.875rem', overflow: 'hidden', background: '#000', aspectRatio: '16/9', maxHeight: '320px' }}>
        <video ref={videoRef} muted autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {countdown > 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
            <span style={{ fontSize: '5rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{countdown}</span>
          </div>
        )}
        {recording && (
          <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', background: 'rgba(173,44,77,0.9)', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'portal-pulse 1s ease-in-out infinite', display: 'block' }} />
            REC
          </div>
        )}
      </div>

      {/* Controls */}
      {recording && !playbackUrl && (
        <button type="button" onClick={stopRecording} className="btn btn-primary" style={{ background: 'var(--color-accent)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">stop_circle</span>
          Stop Recording
        </button>
      )}

      {/* Playback */}
      {playbackUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-green, #4a9b4f)', verticalAlign: 'middle', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">check_circle</span>{' '}
            Playback — watch yourself!
          </p>
          <video ref={playbackRef} src={playbackUrl} controls playsInline style={{ width: '100%', borderRadius: '0.875rem', background: '#000', maxHeight: '320px', objectFit: 'cover' }} />
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={resetRehearsal} className="btn btn-outline btn-sm">
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }} aria-hidden="true">replay</span> Record again
            </button>
            <button type="button" onClick={() => setStep('pitch')} className="btn btn-outline btn-sm">
              Edit pitch
            </button>
            <button type="button" onClick={() => { setStep('form'); setPlaybackUrl(null); }} className="btn btn-outline btn-sm">
              Start over
            </button>
          </div>
        </div>
      )}

      {!recording && !playbackUrl && countdown === 0 && (
        <button type="button" onClick={() => void startRehearsal()} className="btn btn-outline btn-sm">
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }} aria-hidden="true">replay</span> Try again
        </button>
      )}
    </div>
  );
}
