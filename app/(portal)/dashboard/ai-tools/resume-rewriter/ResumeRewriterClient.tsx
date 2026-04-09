'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ResumeCoachWorkspace from '@/components/portal/ResumeCoachWorkspace';
import ResumeRewriterForm from '@/components/portal/tools/ResumeRewriterForm';

type WorkMode = 'voice' | 'text';

type ResumeResponse = {
  hasOriginal?: boolean;
  resumePlainText?: string | null;
};

const MODE_KEY = 'resumeWorkMode';

function ResumeModeSelector({ onSelect, onDismiss }: { onSelect: (mode: WorkMode) => void; onDismiss: () => void }) {
  return (
    <div
      className="stitch-card"
      style={{
        padding: '1.25rem',
        borderRadius: 16,
        marginBottom: '1rem',
        border: '1px solid var(--outline-variant, rgba(0,0,0,0.08))',
        background: 'linear-gradient(180deg, rgba(173,44,77,0.08), rgba(173,44,77,0.02))',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
            Choose your workflow
          </p>
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-on-surface)' }}>How would you like to work on your resume?</h2>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Pick the experience that fits how you want to improve your resume right now.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--color-on-surface-variant)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          Maybe later
        </button>
      </div>

      <div style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <button
          type="button"
          onClick={() => onSelect('voice')}
          style={{
            textAlign: 'left',
            borderRadius: 14,
            border: '1px solid rgba(37, 99, 235, 0.18)',
            background: 'rgba(37, 99, 235, 0.08)',
            padding: '1rem',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.55rem' }}>
            <span style={{ fontSize: '1.25rem' }} aria-hidden>🎙</span>
            <strong style={{ color: 'var(--color-on-surface)', fontSize: '0.98rem' }}>Voice Coach</strong>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8', background: 'rgba(255,255,255,0.7)', borderRadius: 999, padding: '0.15rem 0.45rem' }}>
              Recommended
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.5, fontSize: '0.86rem' }}>
            Talk through your resume with an AI coach and apply suggestions as you go.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelect('text')}
          style={{
            textAlign: 'left',
            borderRadius: 14,
            border: '1px solid var(--outline-variant, rgba(0,0,0,0.08))',
            background: 'var(--surface-container-low)',
            padding: '1rem',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.55rem' }}>
            <span style={{ fontSize: '1.25rem' }} aria-hidden>✏️</span>
            <strong style={{ color: 'var(--color-on-surface)', fontSize: '0.98rem' }}>Text Tool</strong>
          </div>
          <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.5, fontSize: '0.86rem' }}>
            Rewrite and edit your resume manually with the existing AI tool.
          </p>
        </button>
      </div>
    </div>
  );
}

function ResumeRewriterWithPrefill() {
  const [resumeText, setResumeText] = useState('');
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasStoredResume, setHasStoredResume] = useState(false);
  const [showLoadedBanner, setShowLoadedBanner] = useState(false);
  const [showUploadBanner, setShowUploadBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/member/resume?includePlainText=1')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load resume');
        return res.json() as Promise<ResumeResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        const plainText = data.resumePlainText?.trim() ?? '';
        const hasOriginal = Boolean(data.hasOriginal);

        if (plainText) {
          setResumeText((prev) => prev.trim() || plainText);
          setHasStoredResume(true);
          setShowLoadedBanner(true);
          setShowUploadBanner(false);
        } else {
          setHasStoredResume(false);
          setShowLoadedBanner(false);
          setShowUploadBanner(!hasOriginal);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShowLoadedBanner(false);
          setShowUploadBanner(false);
        }
      })
      .finally(() => {
        if (!cancelled) setHasHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ResumeRewriterForm
      resumeControlled={resumeText}
      onResumeChange={setResumeText}
      resumeBanner={hasHydrated ? (
        <>
          {showLoadedBanner && hasStoredResume ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexWrap: 'wrap',
                padding: '0.85rem 1rem',
                borderRadius: 10,
                background: 'rgba(74,155,79,0.1)',
                color: 'var(--color-green, #4a9b4f)',
                border: '1px solid rgba(74,155,79,0.2)',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', lineHeight: 1.4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden="true">description</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                  Your uploaded resume has been loaded. Edit below or{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setResumeText('');
                      setShowLoadedBanner(false);
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'inherit',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Replace with new
                  </button>
                </span>
              </div>
            </div>
          ) : null}

          {showUploadBanner ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                flexWrap: 'wrap',
                padding: '0.85rem 1rem',
                borderRadius: 10,
                background: 'var(--surface-container-low)',
                color: 'var(--color-on-surface-variant)',
                border: '1px solid var(--outline-variant, rgba(0,0,0,0.08))',
                marginBottom: '0.75rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden="true">upload_file</span>
              <span style={{ fontSize: '0.88rem' }}>
                No resume uploaded yet.{' '}
                <Link href="/dashboard/resume" style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'underline' }}>
                  Upload your resume →
                </Link>
              </span>
            </div>
          ) : null}
        </>
      ) : null}
    />
  );
}

export default function ResumeRewriterClient() {
  const [mode, setMode] = useState<WorkMode | null>(null);
  const [selectorDismissed, setSelectorDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(MODE_KEY);
    if (saved === 'voice' || saved === 'text') {
      setMode(saved);
    }
    setHydrated(true);
  }, []);

  const handleSelect = (nextMode: WorkMode) => {
    window.localStorage.setItem(MODE_KEY, nextMode);
    setMode(nextMode);
    setSelectorDismissed(false);
  };

  const handleResetMode = () => {
    window.localStorage.removeItem(MODE_KEY);
    setMode(null);
    setSelectorDismissed(false);
  };

  const showSelector = hydrated && mode === null && !selectorDismissed;
  const effectiveMode: WorkMode = mode ?? 'text';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={handleResetMode}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--color-accent)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          Switch mode
        </button>
      </div>

      {showSelector ? (
        <ResumeModeSelector onSelect={handleSelect} onDismiss={() => setSelectorDismissed(true)} />
      ) : null}

      {effectiveMode === 'voice' ? <ResumeCoachWorkspace /> : <ResumeRewriterWithPrefill />}
    </div>
  );
}
