'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ResumeRewriterForm from '@/components/portal/tools/ResumeRewriterForm';

type ResumeResponse = {
  hasOriginal?: boolean;
  resumePlainText?: string | null;
};

/* Compact promo strip — was a heavy primary card competing with the
   form below. Demoted to a single inline note (audit #130) so the
   form is the visual focus. */
function ResumeCoachRedirectCard() {
  return (
    <p
      style={{
        margin: '0 0 0.75rem',
        padding: '0.5rem 0.875rem',
        borderRadius: 10,
        border: '1px solid color-mix(in srgb, var(--color-blue) 18%, transparent)',
        background: 'color-mix(in srgb, var(--color-blue) 5%, transparent)',
        fontSize: '0.8125rem',
        color: 'var(--color-on-surface-variant)',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <span aria-hidden style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-blue)' }}>
        Tip
      </span>
      <span>Prefer talking it through? </span>
      <Link
        href="/dashboard/ai-tools/resume-coach"
        style={{ color: 'var(--color-blue)', fontWeight: 700, textDecoration: 'underline' }}
      >
        Open Resume Coach for the voice flow →
      </Link>
    </p>
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <div>
      {hydrated ? <ResumeCoachRedirectCard /> : null}
      <ResumeRewriterWithPrefill />
    </div>
  );
}
