'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import type { ComparisonTrack } from '@/lib/content/programComparisonTracks';
import { getProgramExtra } from '@/lib/content/programExtras';

const MAX_PICK = 4;
const MIN_PICK = 2;

/** Guided entry points — fast on-ramp, broad IT hire path, strong data demand */
const STARTER_SLUGS = [
  'digital-literacy-empowerment-class',
  'it-support-professional-certificate-ibm',
  'data-analytics-professional-certificate-google',
] as const;

function parseSalaryMidK(salaryLabel: string): number | null {
  const m = salaryLabel.match(/\$(\d+)K/);
  return m ? parseInt(m[1], 10) : null;
}

type Props = { tracks: ComparisonTrack[] };

export default function ProgramComparisonClient({ tracks }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const initFromUrlRef = useRef(false);

  useEffect(() => {
    if (initFromUrlRef.current) return;
    initFromUrlRef.current = true;
    const raw = searchParams.get('compare');
    if (raw) {
      const want = new Set(
        raw
          .split(',')
          .map((s) => s.trim())
          .filter((s) => tracks.some((t) => t.slug === s))
          .slice(0, MAX_PICK)
      );
      if (want.size >= MIN_PICK) setSelected(want);
    }
    setHydrated(true);
  }, [searchParams, tracks]);

  useEffect(() => {
    if (!hydrated) return;
    const arr = [...selected];
    if (arr.length >= MIN_PICK) {
      const q = arr.slice(0, MAX_PICK).sort().join(',');
      router.replace(`/program-comparison?compare=${q}`, { scroll: false });
    } else {
      router.replace('/program-comparison', { scroll: false });
    }
  }, [selected, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps -- omit router; avoid replace loops

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else if (next.size < MAX_PICK) next.add(slug);
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const selectedTracks = useMemo(
    () => tracks.filter((t) => selected.has(t.slug)).sort((a, b) => a.shortName.localeCompare(b.shortName)),
    [tracks, selected]
  );

  const starterTracks = useMemo(
    () => STARTER_SLUGS.map((slug) => tracks.find((t) => t.slug === slug)).filter(Boolean) as ComparisonTrack[],
    [tracks]
  );

  const tradeoffNote = useMemo(() => {
    if (selectedTracks.length < 2) return null;
    const mids = selectedTracks.map((t) => ({ t, mid: parseSalaryMidK(t.salary) })).filter((x) => x.mid != null) as {
      t: ComparisonTrack;
      mid: number;
    }[];
    if (mids.length < 2) return null;
    const sorted = [...mids].sort((a, b) => a.mid - b.mid);
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    if (low.t.slug === high.t.slug) return null;
    return `Published starting bands: ${low.t.shortName} is the gentler on-ramp; ${high.t.shortName} shows a higher top-of-range — usually with more depth and time. Pick what you can finish, not only the bigger number.`;
  }, [selectedTracks]);

  const showSideBySide = hydrated && selected.size >= MIN_PICK;

  return (
    <>
      <div className="program-comparison-decision-guide">
        <h2 className="program-comparison-guide-title">How to use this page</h2>
        <ol className="program-comparison-journey-steps">
          <li>
            <strong>Start with fit</strong> — use the pathfinder quiz or the recommended starters below.
          </li>
          <li>
            <strong>Narrow with the table</strong> — check up to {MAX_PICK} programs, then open{' '}
            <strong>side-by-side comparison</strong> to see tradeoffs.
          </li>
          <li>
            <strong>Confirm with salary context</strong> —{' '}
            <Link href="/salary-guide">Salary guide</Link> uses the same bands as program pages.
          </li>
        </ol>
        <p className="program-comparison-guide-lead">Pick based on what matters most:</p>
        <ul className="program-comparison-guide-list">
          <li>
            <strong>Time:</strong> Digital Literacy is the fastest on-ramp; most tracks run about 3–5 months at ~10 hours
            a week (your pace may vary).
          </li>
          <li>
            <strong>Difficulty (⭐–⭐⭐⭐):</strong> ⭐ = beginner-friendly. ⭐⭐⭐ = steeper curve, usually higher Austin-area
            earning potential.
          </li>
          <li>
            <strong>Tech comfort:</strong> Uncomfortable with computers? Start with Digital Literacy, then stack into IT
            Support or another track.
          </li>
          <li>
            <strong>Salary vs. ramp:</strong> Higher ranges usually mean more depth. Finish the program you start.
          </li>
        </ul>
      </div>

      <section className="program-comparison-starters" aria-labelledby="starters-heading">
        <h2 id="starters-heading" className="program-comparison-starters-title">
          Recommended starting points
        </h2>
        <p className="program-comparison-starters-lead">
          Three common front doors — not the only options. Use checkboxes in the table to compare any tracks side-by-side.
        </p>
        <ul className="program-comparison-starters-grid">
          {starterTracks.map((t) => {
            const extra = getProgramExtra(t.slug);
            return (
              <li key={t.slug}>
                <article className="program-comparison-starter-card">
                  <h3>{t.shortName}</h3>
                  {extra?.bestFor && <p className="program-comparison-starter-best">{extra.bestFor}</p>}
                  <p className="program-comparison-starter-meta">
                    {t.duration} · {t.difficulty} · {t.salary}
                  </p>
                  <div className="program-comparison-starter-actions">
                    <Link href={`/programs/${t.slug}`} className="btn btn-outline btn-sm">
                      Program detail
                    </Link>
                    <label className="program-comparison-starter-pick">
                      <input
                        type="checkbox"
                        checked={selected.has(t.slug)}
                        onChange={() => toggle(t.slug)}
                        aria-label={`Add ${t.shortName} to comparison`}
                      />
                      Compare
                    </label>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
        <p className="program-comparison-starters-more">
          <Link href="/find-your-path">Take the 2-minute quiz</Link> for ranked matches →{' '}
          <Link href="/programs">browse all 19 programs</Link>.
        </p>
      </section>

      {showSideBySide && (
        <section className="program-comparison-sidebyside" aria-labelledby="sidebyside-heading">
          <div className="program-comparison-sidebyside-header">
            <h2 id="sidebyside-heading">Side-by-side comparison</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearSelection}>
              Clear selection
            </button>
          </div>
          {tradeoffNote && <p className="program-comparison-tradeoff">{tradeoffNote}</p>}
          <div className="program-comparison-matrix-wrap">
            <table className="program-comparison-matrix">
              <thead>
                <tr>
                  <th scope="col">Criteria</th>
                  {selectedTracks.map((t) => (
                    <th key={t.slug} scope="col">
                      <Link href={`/programs/${t.slug}`}>{t.shortName}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Duration</th>
                  {selectedTracks.map((t) => (
                    <td key={t.slug}>{t.duration}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Difficulty</th>
                  {selectedTracks.map((t) => (
                    <td key={t.slug}>{t.difficulty}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Starting range (Austin-area)</th>
                  {selectedTracks.map((t) => (
                    <td key={t.slug}>{t.salary}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Demand</th>
                  {selectedTracks.map((t) => (
                    <td key={t.slug}>
                      <span className="demand-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {t.demand === 'Very High' && <Flame size={14} aria-hidden />}
                        {t.demand}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Best for</th>
                  {selectedTracks.map((t) => {
                    const ex = getProgramExtra(t.slug);
                    return (
                      <td key={t.slug}>{ex?.bestFor ?? '—'}</td>
                    );
                  })}
                </tr>
                <tr>
                  <th scope="row">Certifications</th>
                  {selectedTracks.map((t) => (
                    <td key={t.slug}>{t.certs}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Next step</th>
                  {selectedTracks.map((t) => (
                    <td key={t.slug}>
                      <Link href={`/apply?program=${t.slug}`} className="btn btn-secondary btn-sm">
                        Apply
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="program-comparison-pick-toolbar">
        <p>
          <strong>Select {MIN_PICK}–{MAX_PICK} programs</strong> from the table or cards (checkboxes).{' '}
          {selected.size >= MIN_PICK ? (
            <span className="program-comparison-pick-status">Side-by-side view is on above.</span>
          ) : (
            <span className="program-comparison-pick-status">{selected.size} selected — add {MIN_PICK - selected.size} more.</span>
          )}
        </p>
      </div>

      <div className="program-comparison-table-wrap">
        <table className="comparison-table program-table program-comparison-table-pick">
          <thead>
            <tr>
              <th className="program-comparison-pick-col" scope="col">
                Compare
              </th>
              <th>Track</th>
              <th>Duration</th>
              <th>Difficulty</th>
              <th>Avg. Starting Salary</th>
              <th>Job Demand</th>
              <th>Certifications</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((t) => (
              <tr key={t.slug}>
                <td className="program-comparison-pick-col">
                  <input
                    type="checkbox"
                    checked={selected.has(t.slug)}
                    onChange={() => toggle(t.slug)}
                    aria-label={`Include ${t.shortName} in comparison`}
                    disabled={!selected.has(t.slug) && selected.size >= MAX_PICK}
                  />
                </td>
                <td>
                  <Link href={`/programs/${t.slug}`}>
                    <strong>{t.shortName}</strong>
                  </Link>
                </td>
                <td>{t.duration}</td>
                <td>{t.difficulty}</td>
                <td>{t.salary}</td>
                <td>
                  <span className="demand-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    {t.demand === 'Very High' && <Flame size={14} className="text-current" aria-hidden />}
                    {t.demand}
                  </span>
                </td>
                <td>{t.certs}</td>
                <td>
                  <Link href={`/apply?program=${t.slug}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                    Apply
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="program-cards program-comparison-cards-pick" role="list" aria-label="Program comparison cards">
        {tracks.map((t) => {
          const extra = getProgramExtra(t.slug);
          return (
            <li key={t.slug}>
              <article className="program-comparison-card" aria-labelledby={`program-card-title-${t.slug}`}>
                <div className="program-comparison-card__pick-row">
                  <input
                    type="checkbox"
                    id={`compare-${t.slug}`}
                    checked={selected.has(t.slug)}
                    onChange={() => toggle(t.slug)}
                    disabled={!selected.has(t.slug) && selected.size >= MAX_PICK}
                  />
                  <label htmlFor={`compare-${t.slug}`}>Compare</label>
                </div>
                <div className="program-comparison-card__header">
                  <Link id={`program-card-title-${t.slug}`} href={`/programs/${t.slug}`} className="program-comparison-card__title">
                    {t.shortName}
                  </Link>
                  <Link href={`/apply?program=${t.slug}`} className="btn btn-secondary program-comparison-card__apply" aria-label={`Apply to ${t.shortName}`}>
                    Apply
                  </Link>
                </div>
                {extra?.bestFor && (
                  <p className="program-comparison-card__best-for">
                    <strong>Best for:</strong> {extra.bestFor}
                  </p>
                )}
                {extra?.jobOutcomes && extra.jobOutcomes.length > 0 && (
                  <p className="program-comparison-card__outcomes">
                    <strong>Roles:</strong> {extra.jobOutcomes.join(' · ')}
                  </p>
                )}
                <div className="program-comparison-card__stats">
                  <span>{t.duration}</span>
                  <span className="program-comparison-card__stats-sep" aria-hidden>
                    |
                  </span>
                  <span aria-label={`Difficulty rating ${t.difficulty}`}>{t.difficulty}</span>
                  <span className="program-comparison-card__stats-sep" aria-hidden>
                    |
                  </span>
                  <span>{t.salary}</span>
                </div>
                <div className="program-comparison-card__demand">
                  <span className="program-comparison-card__demand-label">Job demand</span>
                  <span className="demand-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    {t.demand === 'Very High' && <Flame size={14} className="text-current" aria-hidden />}
                    {t.demand}
                  </span>
                </div>
                <p className="program-comparison-card__certs">
                  <span className="program-comparison-card__certs-label">Certifications</span>
                  {t.certs}
                </p>
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}
