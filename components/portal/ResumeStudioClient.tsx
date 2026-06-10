'use client';

import { useCallback } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import ResumeStrengthForm from '@/components/portal/tools/ResumeStrengthForm';
import ResumeRewriterClient from '@/app/(portal)/dashboard/ai-tools/resume-rewriter/ResumeRewriterClient';

const ResumeCoachWorkspace = dynamic(() => import('@/components/portal/ResumeCoachWorkspace'), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      className="portal-card portal-card--flat"
      style={{
        minHeight: 360,
        padding: '2.5rem 1.25rem',
        borderRadius: 12,
        textAlign: 'center',
        color: 'var(--color-on-surface-variant)',
        fontSize: '0.9rem',
        fontWeight: 600,
      }}
    >
      Loading resume coach…
    </div>
  ),
});

export type ResumeStudioView = 'score' | 'rewrite' | 'coach';

const VIEWS: { id: ResumeStudioView; icon: string }[] = [
  { id: 'score', icon: 'speed' },
  { id: 'rewrite', icon: 'auto_fix_high' },
  { id: 'coach', icon: 'record_voice_over' },
];

export function normalizeStudioView(value: string | undefined): ResumeStudioView {
  return value === 'rewrite' || value === 'coach' ? value : 'score';
}

type Props = {
  hasResume: boolean;
  /** Server-rendered history panel slots, shown under the matching view. */
  scoreHistorySlot?: ReactNode;
  rewriteHistorySlot?: ReactNode;
};

export default function ResumeStudioClient({ hasResume, scoreHistorySlot, rewriteHistorySlot }: Props) {
  const t = useTranslations('resumeStudio');
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = normalizeStudioView(searchParams?.get('view') ?? undefined);

  const setView = useCallback(
    (next: ResumeStudioView) => {
      router.replace(`/dashboard/ai-tools/resume-studio?view=${next}`, { scroll: false });
    },
    [router]
  );

  return (
    <div>
      {/* ── View switcher ── */}
      <div
        role="tablist"
        aria-label={t('viewsLabel')}
        className="resume-studio-tabs"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.4rem',
          padding: 4,
          borderRadius: 14,
          background: 'var(--surface-container-high)',
          marginBottom: '1rem',
        }}
      >
        {VIEWS.map((v) => {
          const active = v.id === view;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setView(v.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                minHeight: 48,
                padding: '0.55rem 0.5rem',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: active ? 'var(--color-surface)' : 'transparent',
                color: active ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden>
                {v.icon}
              </span>
              {t(`tabs.${v.id}`)}
            </button>
          );
        })}
      </div>

      {view === 'score' && (
        <div>
          {!hasResume && (
            <div
              className="portal-card portal-card--flat"
              style={{ padding: '1.1rem 1.25rem', borderRadius: 14, marginBottom: '1rem', background: 'var(--surface-container-low)' }}
            >
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
                {t('emptyTitle')}
              </h2>
              <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: '0.55rem' }}>
                {([1, 2, 3] as const).map((step) => (
                  <li key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                    <span
                      aria-hidden
                      style={{
                        flexShrink: 0,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'rgba(173,44,77,0.12)',
                        color: 'var(--color-accent)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {step}
                    </span>
                    <span style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)' }}>
                      {t(`emptyStep${step}`)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <ResumeStrengthForm />

          {/* ── Next-step actions ── */}
          <div
            className="portal-card portal-card--flat"
            style={{ padding: '1.1rem 1.25rem', borderRadius: 14, marginTop: '1.25rem', background: 'var(--surface-container-low)' }}
          >
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              {t('nextStepsTitle')}
            </p>
            <div className="resume-studio-cta-row" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ minHeight: 48, flex: '1 1 220px', justifyContent: 'center' }}
                onClick={() => setView('rewrite')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden>
                  auto_fix_high
                </span>
                {t('ctaRewrite')}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ minHeight: 48, flex: '1 1 220px', justifyContent: 'center' }}
                onClick={() => setView('coach')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden>
                  record_voice_over
                </span>
                {t('ctaCoach')}
              </button>
            </div>
          </div>

          {scoreHistorySlot}
        </div>
      )}

      {view === 'rewrite' && (
        <div>
          <div
            className="portal-card portal-card--flat"
            style={{ padding: '1.5rem', borderRadius: 16, marginBottom: '1.25rem' }}
          >
            <ResumeRewriterClient />
          </div>
          {rewriteHistorySlot}
        </div>
      )}

      {view === 'coach' && <ResumeCoachWorkspace />}
    </div>
  );
}
