'use client';

import { CheckCircle2, AlertCircle, Target, Briefcase } from 'lucide-react';

export interface SubscoreBreakdown {
  score: number;
  weight: number;
  notes: string[];
}

export interface ResumeScorePayload {
  composite?: number;
  pillars?: {
    structural?: { score: number; label: string } | null;
    onetCoverage?: { score: number; label: string } | null;
    marketCoverage?: { score: number; label: string } | null;
  };
  structural?: {
    composite: number;
    breakdown: {
      structure: SubscoreBreakdown;
      quantification: SubscoreBreakdown;
      actionVerbs: SubscoreBreakdown;
      bulletLength: SubscoreBreakdown;
      contact: SubscoreBreakdown;
    };
  };
  occupations?: Array<{ onetCode: string; title: string; confidence: number }>;
  onetCoverage?: Array<{
    onetCode: string;
    title: string;
    coverageScore: number;
    topGaps: Array<{ skill: string; importance: number; bestSimilarity: number }>;
  }>;
  marketCoverage?: Array<{
    postingCount: number;
    source: 'firecrawl' | 'cache' | 'unavailable';
    coverageScore: number;
    mustHaveMissing: Array<{ phrase: string; frequency: number }>;
    mustHavePresent: Array<{ phrase: string; frequency: number }>;
  }>;
}

function colorForScore(score: number): string {
  if (score >= 80) return 'var(--md-sys-color-tertiary, #16a34a)';
  if (score >= 60) return 'var(--md-sys-color-secondary, #ca8a04)';
  return 'var(--md-sys-color-error, #dc2626)';
}

function Bar({ score }: { score: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: 6,
        background: 'var(--surface-container-high)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, score))}%`,
          height: '100%',
          background: colorForScore(score),
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}

const STRUCTURAL_LABELS: Record<string, string> = {
  structure: 'Sections present',
  quantification: 'Quantified achievements',
  actionVerbs: 'Action-verb openers',
  bulletLength: 'Bullet readability',
  contact: 'Contact essentials',
};

export default function ResumeScoreBreakdown({ payload }: { payload: ResumeScorePayload }) {
  const composite = payload.composite ?? payload.structural?.composite ?? 0;
  const pillars = payload.pillars ?? {};

  return (
    <div
      className="portal-card portal-card--flat"
      style={{
        padding: '1.25rem',
        borderRadius: 12,
        marginTop: '1.5rem',
        marginBottom: '1.5rem',
        background: 'var(--surface-container-low)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* Composite header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)' }}>
            Composite Score
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, color: colorForScore(composite), lineHeight: 1 }}>
            {composite}
            <span style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', fontWeight: 400 }}>/100</span>
          </div>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', maxWidth: 320 }}>
          Weighted across structural ATS basics, O*NET skill coverage, and live market keywords.
        </div>
      </div>

      {/* Three pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        {pillars.structural && (
          <PillarTile label={pillars.structural.label} score={pillars.structural.score} icon={<CheckCircle2 size={16} />} />
        )}
        {pillars.onetCoverage && (
          <PillarTile label={pillars.onetCoverage.label} score={pillars.onetCoverage.score} icon={<Target size={16} />} />
        )}
        {pillars.marketCoverage && (
          <PillarTile label={pillars.marketCoverage.label} score={pillars.marketCoverage.score} icon={<Briefcase size={16} />} />
        )}
      </div>

      {/* Structural subscore breakdown */}
      {payload.structural && (
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Structural subscores (deterministic)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(payload.structural.breakdown).map(([key, sub]) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 50px', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem' }}>{STRUCTURAL_LABELS[key] ?? key}</span>
                <Bar score={sub.score} />
                <span style={{ fontSize: '0.82rem', textAlign: 'right', color: colorForScore(sub.score), fontWeight: 600 }}>
                  {sub.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target occupations + O*NET gaps */}
      {payload.occupations && payload.occupations.length > 0 && (
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Target occupations (inferred)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {payload.occupations.map((occ) => {
              const cov = payload.onetCoverage?.find((c) => c.onetCode === occ.onetCode);
              return (
                <div key={occ.onetCode} style={{ padding: '0.75rem', borderRadius: 8, background: 'var(--surface-container-high)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{occ.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                      {occ.onetCode} · {Math.round(occ.confidence * 100)}% fit
                    </span>
                  </div>
                  {cov && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
                        <Bar score={cov.coverageScore} />
                        <span style={{ fontSize: '0.82rem', textAlign: 'right', color: colorForScore(cov.coverageScore), fontWeight: 600 }}>
                          {cov.coverageScore}
                        </span>
                      </div>
                      {cov.topGaps.length > 0 && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                            <AlertCircle size={12} />
                            <span>Top gaps</span>
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            {cov.topGaps.slice(0, 4).map((g) => (
                              <li key={g.skill}>
                                <strong>{g.skill}</strong> <span style={{ opacity: 0.7 }}>(importance {g.importance})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Market keyword coverage */}
      {payload.marketCoverage && payload.marketCoverage.some((m) => m.source !== 'unavailable') && (
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Live market keywords
          </div>
          {payload.marketCoverage.map((m, i) => {
            if (m.source === 'unavailable') return null;
            const occ = payload.occupations?.[i];
            return (
              <div key={i} style={{ padding: '0.75rem', borderRadius: 8, background: 'var(--surface-container-high)', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>
                  <span>{occ?.title ?? 'occupation'}</span>
                  <span>{m.postingCount} live postings · {m.source}</span>
                </div>
                {m.mustHaveMissing.length > 0 && (
                  <div style={{ fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--md-sys-color-error, #dc2626)' }}>
                      Missing from your resume (in ≥70% of postings):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {m.mustHaveMissing.slice(0, 8).map((kw) => (
                        <span key={kw.phrase} style={{ padding: '0.15rem 0.5rem', borderRadius: 999, background: 'var(--surface-container-low)', border: '1px solid var(--md-sys-color-error, #dc2626)', fontSize: '0.72rem' }}>
                          {kw.phrase} ({Math.round(kw.frequency * 100)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {m.mustHavePresent.length > 0 && (
                  <div style={{ fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--md-sys-color-tertiary, #16a34a)' }}>
                      You already cover:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {m.mustHavePresent.slice(0, 8).map((kw) => (
                        <span key={kw.phrase} style={{ padding: '0.15rem 0.5rem', borderRadius: 999, background: 'var(--surface-container-low)', border: '1px solid var(--md-sys-color-tertiary, #16a34a)', fontSize: '0.72rem' }}>
                          {kw.phrase}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PillarTile({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  return (
    <div style={{ padding: '0.75rem', borderRadius: 8, background: 'var(--surface-container-high)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.35rem' }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: colorForScore(score), lineHeight: 1 }}>
        {score}
        <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', fontWeight: 400 }}>/100</span>
      </div>
      <div style={{ marginTop: '0.4rem' }}>
        <Bar score={score} />
      </div>
    </div>
  );
}
