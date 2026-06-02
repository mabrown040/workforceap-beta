'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import ResumeRewriterForm from '@/components/portal/tools/ResumeRewriterForm';

type ResumeResponse = {
  hasOriginal?: boolean;
  resumePlainText?: string | null;
};

function ResumeCoachRedirectCard() {
  return (
    <div
      className="portal-card portal-card--flat"
      style={{
        padding: '1rem 1.1rem',
        borderRadius: 16,
        marginBottom: '1rem',
        border: '1px solid rgba(37, 99, 235, 0.16)',
        background: 'linear-gradient(180deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.02))',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1d4ed8' }}>
            Dedicated voice flow
          </p>
          <h2 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-on-surface)' }}>Want voice coaching instead?</h2>
          <p style={{ margin: '0.45rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.88rem', lineHeight: 1.5, maxWidth: 560 }}>
            Resume Coach now runs in its own full-screen flow so you can talk through your experience, review suggested phrasing, and keep your live draft synced without the text tool crowding it.
          </p>
        </div>
        <Link
          href="/dashboard/ai-tools/resume-coach"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            minHeight: '2.7rem',
            borderRadius: 999,
            textDecoration: 'none',
            padding: '0.65rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          }}
        >
          Open Resume Coach
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden>
            arrow_forward
          </span>
        </Link>
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
  const loadedTextRef = useRef<string | null>(null);

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
          loadedTextRef.current = plainText;
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
      onResumeChange={(val) => {
        setResumeText(val);
        if (showLoadedBanner && loadedTextRef.current !== null && val !== loadedTextRef.current) {
          setShowLoadedBanner(false);
        }
      }}
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
