'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Video,
  CircleStop,
  RotateCcw,
  CheckCircle2} from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import { FormField, StatusTag } from '@/components/portal/kit';
import AiToolLanguageSelector, { type AiToolLanguage } from './AiToolLanguageSelector';
import ToolFollowThrough from './ToolFollowThrough';
import AiToolError from './AiToolError';

type Step = 'form' | 'pitch' | 'rehearse';

const fieldStyle: React.CSSProperties = {
  marginTop: 4,
  width: '100%',
  fontSize: 14,
  border: '1px solid var(--wa-border)',
  borderRadius: 'var(--wa-radius-sm)',
  padding: '10px 12px',
  outline: 'none',
  background: 'var(--wa-surface)',
  color: 'var(--wa-text)',
  fontFamily: 'inherit'};

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 46,
  padding: '10px 20px',
  background: 'var(--wa-accent)',
  color: 'var(--wa-on-accent)',
  fontWeight: 700,
  fontSize: 14,
  borderRadius: 999,
  border: 'none',
  cursor: 'pointer'};

const outlineBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 36,
  padding: '7px 14px',
  fontSize: 12.5,
  fontWeight: 700,
  borderRadius: 999,
  border: '1px solid var(--wa-border)',
  background: 'var(--wa-surface)',
  color: 'var(--wa-text)',
  cursor: 'pointer'};

const btnFocusClass =
  'wa-kit-focus enabled:hover:wa-opacity-90 enabled:active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none';

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
        body: JSON.stringify({ name, targetRole, strengths, certifications, industry, language })});
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
        <div
          className="wa-kit-card wa-kit-card--sm"
          style={{ background: 'color-mix(in srgb, var(--wa-accent) 6%, transparent)', border: 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}
        >
          <Sparkles size={17} color="var(--wa-accent)" aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: '0.8125rem', color: 'var(--wa-text)', margin: 0, lineHeight: 1.55 }}>
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
          <FormField
            key={id}
            id={id}
            label={required ? `${label} *` : label}
          >
            <input
              id={id}
              type="text"
              value={value}
              onChange={e => set(e.target.value)}
              placeholder={placeholder}
              required={required}
              style={fieldStyle}
            />
          </FormField>
        ))}

        {genError ? <AiToolError error={genError} /> : null}

        <button
          type="submit"
          disabled={generating || !name.trim() || !targetRole.trim()}
          aria-busy={generating}
          className={btnFocusClass}
          style={{ ...primaryBtnStyle, opacity: generating || !name.trim() || !targetRole.trim() ? 0.7 : 1, alignSelf: 'flex-start' }}
        >
          <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {generating ? (
              <>
                <PortalInlineSpinner size={16} /> Writing your pitch…
              </>
            ) : (
              <>
                <Sparkles size={16} aria-hidden /> Write My Elevator Pitch
              </>
            )}
          </span>
        </button>
      </form>
    );
  }

  // ── PITCH REVIEW STEP ──────────────────────────────────────
  if (step === 'pitch') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="wa-kit-card wa-kit-card--sm">
          <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--wa-accent)', margin: '0 0 0.75rem' }}>
            Your Elevator Pitch
          </p>
          <p style={{ fontSize: '1.0625rem', lineHeight: 1.7, color: 'var(--wa-text)', margin: 0, fontStyle: 'italic' }}>
            &ldquo;{pitch}&rdquo;
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => void handleCopy()} className="wa-kit-focus" style={outlineBtnStyle}>
              <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </button>
            <button type="button" onClick={() => setStep('form')} className="wa-kit-focus" style={outlineBtnStyle}>
              Edit answers
            </button>
          </div>
          <div style={{ marginTop: '1rem' }}>
            {emailStatus?.sent ? (
              <StatusTag tone="ok">Emailed to you for later</StatusTag>
            ) : (
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--wa-muted)' }}>
                We generated your speech, but email did not send{emailStatus?.error ? `: ${emailStatus.error}` : '.'} Copy it now and try again if needed.
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--wa-text)', margin: 0 }}>Ready to rehearse?</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--wa-muted)', margin: 0, lineHeight: 1.5 }}>
            We&rsquo;ll turn on your camera and mic. Read the speech out loud, watch yourself, and refine the delivery immediately.
          </p>
          <button type="button" onClick={() => void startRehearsal()} className={btnFocusClass} style={{ ...primaryBtnStyle, alignSelf: 'flex-start' }}>
            <Video size={17} aria-hidden />
            Start Rehearsal Recording
          </button>
          {recordingError && <p style={{ color: 'var(--wa-danger)', fontSize: '0.875rem', margin: 0 }}>{recordingError}</p>}
        </div>

        <ToolFollowThrough toolType="elevator_pitch" output={pitch} />
      </div>
    );
  }

  // ── REHEARSAL STEP ─────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Pitch prompt card */}
      <div
        className="wa-kit-card wa-kit-card--sm"
        style={{ background: 'color-mix(in srgb, var(--wa-accent) 6%, transparent)', border: 'none' }}
      >
        <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--wa-accent)', margin: '0 0 0.5rem' }}>
          Read this out loud ↓
        </p>
        <p style={{ fontSize: '1.0625rem', lineHeight: 1.65, color: 'var(--wa-text)', margin: 0, fontWeight: 600 }}>
          &ldquo;{pitch}&rdquo;
        </p>
      </div>

      {/* Camera live feed */}
      <div style={{ position: 'relative', borderRadius: 'var(--wa-radius-sm)', overflow: 'hidden', background: '#000', aspectRatio: '16/9', maxHeight: '320px' }}>
        <video ref={videoRef} muted autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {countdown > 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
            <span style={{ fontSize: '5rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{countdown}</span>
          </div>
        )}
        {recording && (
          <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', background: 'var(--wa-accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'portal-pulse 1s ease-in-out infinite', display: 'block' }} />
            REC
          </div>
        )}
      </div>

      {/* Controls */}
      {recording && !playbackUrl && (
        <button type="button" onClick={stopRecording} className={btnFocusClass} style={{ ...primaryBtnStyle, alignSelf: 'flex-start' }}>
          <CircleStop size={17} aria-hidden />
          Stop Recording
        </button>
      )}

      {/* Playback */}
      {playbackUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--wa-text)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="var(--wa-success)" aria-hidden />
            Playback — watch yourself!
          </p>
          <video ref={playbackRef} src={playbackUrl} controls playsInline style={{ width: '100%', borderRadius: 'var(--wa-radius-sm)', background: '#000', maxHeight: '320px', objectFit: 'cover' }} />
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={resetRehearsal} className="wa-kit-focus" style={outlineBtnStyle}>
              <RotateCcw size={13} aria-hidden /> Record again
            </button>
            <button type="button" onClick={() => setStep('pitch')} className="wa-kit-focus" style={outlineBtnStyle}>
              Edit pitch
            </button>
            <button type="button" onClick={() => { setStep('form'); setPlaybackUrl(null); }} className="wa-kit-focus" style={outlineBtnStyle}>
              Start over
            </button>
          </div>
        </div>
      )}

      {!recording && !playbackUrl && countdown === 0 && (
        <button type="button" onClick={() => void startRehearsal()} className="wa-kit-focus" style={outlineBtnStyle}>
          <RotateCcw size={13} aria-hidden /> Try again
        </button>
      )}
    </div>
  );
}
