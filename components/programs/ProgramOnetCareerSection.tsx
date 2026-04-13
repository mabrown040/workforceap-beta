'use client';

import { useEffect, useState } from 'react';

type OccRow = {
  onetCode: string;
  title: string;
  description: string | null;
  jobFamily: string | null;
  experienceBand: string;
  whyRecommended: string | null;
};

export default function ProgramOnetCareerSection({ programSlug }: { programSlug: string }) {
  const [rows, setRows] = useState<OccRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/careers/program-matches/${encodeURIComponent(programSlug)}`);
        const data = await res.json();
        if (!res.ok) {
          return;
        }
        if (!cancelled) {
          setRows(data.occupations ?? []);
        }
      } catch {
        if (!cancelled) setRows(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programSlug]);

  if (rows === null) return null;
  if (rows.length === 0) return null;

  const byBand = (band: string) => rows.filter((r) => r.experienceBand === band);

  return (
    <section style={{ marginBottom: '2rem' }} aria-labelledby="program-onet-heading">
      <h2 id="program-onet-heading" style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>
        Career context (labor market)
      </h2>
      <p style={{ fontSize: '0.95rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
        Sample roles this program supports — framed for employers and job seekers, not raw government text.
      </p>
      {(['beginner', 'some_experience', 'experienced'] as const).map((band) => {
        const list = byBand(band);
        if (list.length === 0) return null;
        const label =
          band === 'beginner' ? 'If you are newer to the field' : band === 'some_experience' ? 'With some experience' : 'With solid experience';
        return (
          <div key={band} style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{label}</h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {list.map((r) => (
                <li key={`${r.onetCode}-${band}`} style={{ marginBottom: '0.75rem' }}>
                  <strong>{r.title}</strong>
                  {r.jobFamily ? (
                    <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}> — {r.jobFamily}</span>
                  ) : null}
                  {r.description && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', lineHeight: 1.55 }}>{r.description}</p>
                  )}
                  {r.whyRecommended && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', fontStyle: 'italic' }}>{r.whyRecommended}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
