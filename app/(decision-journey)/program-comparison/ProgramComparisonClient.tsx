'use client';

import LocalizedLink from '@/components/LocalizedLink';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { localizeHref, useLocaleFromPath } from '@/lib/i18n/client';
import { Flame } from 'lucide-react';
import type { ComparisonTrack } from '@/lib/content/programComparisonTracks';
import { getProgramExtra } from '@/lib/content/programExtras';
import { useScrollAffordance } from '@/components/portal/useScrollAffordance';
import DataTable from '@/components/portal/ui/DataTable';
import type { DataTableColumn } from '@/components/portal/ui/DataTable';

const MAX_PICK = 4;
const MIN_PICK = 2;

/** Guided entry points — broad IT hire path, high-demand security, strong data path */
const STARTER_SLUGS = [
  'it-support-professional-certificate-ibm',
  'cybersecurity-professional-certificate-google',
  'data-analytics-professional-certificate-google',
] as const;

function parseSalaryMidK(salaryLabel: string): number | null {
  const m = salaryLabel.match(/\$(\d+)K/);
  return m ? parseInt(m[1], 10) : null;
}

type Props = { tracks: ComparisonTrack[] };

type MatrixRow = {
  key: string;
  criteriaLabel: ReactNode;
  bySlug: Record<string, ReactNode>;
};

type PickRow =
  | { kind: 'category'; label: string }
  | { kind: 'track'; track: ComparisonTrack };

function DemandCell({ track }: { track: ComparisonTrack }) {
  return (
    <span className="demand-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      {track.demand === 'Very High' && <Flame size={14} className="text-current" aria-hidden />}
      {track.demand}
    </span>
  );
}

export default function ProgramComparisonClient({ tracks }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocaleFromPath();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const initFromUrlRef = useRef(false);
  const matrixScrollRef = useScrollAffordance<HTMLDivElement>();
  const tableScrollRef = useScrollAffordance<HTMLDivElement>();

  useEffect(() => {
    if (initFromUrlRef.current) return;
    initFromUrlRef.current = true;
    const raw = searchParams?.get('compare');
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
      router.replace(localizeHref(`/program-comparison?compare=${q}`, locale), { scroll: false });
    } else {
      router.replace(localizeHref('/program-comparison', locale), { scroll: false });
    }
  }, [selected, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps -- omit router; avoid replace loops

  const toggle = useCallback((slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else if (next.size < MAX_PICK) next.add(slug);
      return next;
    });
  }, []);

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

  const matrixRows = useMemo((): MatrixRow[] => {
    if (selectedTracks.length === 0) return [];
    const cellFor = (fn: (t: ComparisonTrack) => ReactNode) =>
      Object.fromEntries(selectedTracks.map((t) => [t.slug, fn(t)])) as Record<string, ReactNode>;

    return [
      { key: 'duration', criteriaLabel: 'Duration', bySlug: cellFor((t) => t.duration) },
      { key: 'difficulty', criteriaLabel: 'Difficulty', bySlug: cellFor((t) => t.difficulty) },
      { key: 'salary', criteriaLabel: 'Starting range', bySlug: cellFor((t) => t.salary) },
      {
        key: 'demand',
        criteriaLabel: 'Demand',
        bySlug: cellFor((t) => (
          <span className="demand-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            {t.demand === 'Very High' && <Flame size={14} aria-hidden />}
            {t.demand}
          </span>
        )),
      },
      {
        key: 'bestFor',
        criteriaLabel: 'Best for',
        bySlug: cellFor((t) => {
          const ex = getProgramExtra(t.slug);
          return ex?.bestFor ?? '—';
        }),
      },
      { key: 'certs', criteriaLabel: 'Certificates', bySlug: cellFor((t) => t.certs) },
      {
        key: 'next',
        criteriaLabel: 'Next step',
        bySlug: cellFor((t) => (
          <LocalizedLink href={`/apply?program=${t.slug}`} className="btn btn-muted btn-sm">
            Apply
          </LocalizedLink>
        )),
      },
    ];
  }, [selectedTracks]);

  const matrixColumns = useMemo((): DataTableColumn<MatrixRow>[] => {
    const first: DataTableColumn<MatrixRow> = {
      key: 'criteria',
      header: 'Criteria',
      rowHeader: true,
      cellDataLabel: 'Criteria',
      cell: (r) => r.criteriaLabel,
    };
    const trackCols: DataTableColumn<MatrixRow>[] = selectedTracks.map((t) => ({
      key: t.slug,
      header: <LocalizedLink href={`/programs/${t.slug}`}>{t.shortName}</LocalizedLink>,
      cellDataLabel: t.shortName,
      cell: (r) => r.bySlug[t.slug],
    }));
    return [first, ...trackCols];
  }, [selectedTracks]);

  const pickRows = useMemo((): PickRow[] => {
    const out: PickRow[] = [];
    let lastCategory = '';
    for (const t of tracks) {
      if (t.categoryLabel !== lastCategory) {
        lastCategory = t.categoryLabel;
        out.push({ kind: 'category', label: t.categoryLabel });
      }
      out.push({ kind: 'track', track: t });
    }
    return out;
  }, [tracks]);

  const pickColumns = useMemo(
    (): DataTableColumn<PickRow>[] => [
      {
        key: 'compare',
        header: 'Compare',
        columnClassName: 'program-comparison-pick-col',
        cellDataLabel: 'Compare',
        cell: (row) =>
          row.kind === 'track' ? (
            <input
              type="checkbox"
              checked={selected.has(row.track.slug)}
              onChange={() => toggle(row.track.slug)}
              aria-label={`Include ${row.track.shortName} in comparison`}
              disabled={!selected.has(row.track.slug) && selected.size >= MAX_PICK}
            />
          ) : null,
      },
      {
        key: 'track',
        header: 'Track',
        cellDataLabel: 'Track',
        cell: (row) =>
          row.kind === 'track' ? (
            <LocalizedLink href={`/programs/${row.track.slug}`}>
              <strong>{row.track.shortName}</strong>
            </LocalizedLink>
          ) : null,
      },
      {
        key: 'duration',
        header: 'Duration',
        cellDataLabel: 'Duration',
        cell: (row) => (row.kind === 'track' ? row.track.duration : null),
      },
      {
        key: 'difficulty',
        header: 'Difficulty',
        cellDataLabel: 'Difficulty',
        cell: (row) => (row.kind === 'track' ? row.track.difficulty : null),
      },
      {
        key: 'salary',
        header: 'Avg. Starting Salary',
        cellDataLabel: 'Avg. Starting Salary',
        cell: (row) => (row.kind === 'track' ? row.track.salary : null),
      },
      {
        key: 'demand',
        header: 'Job Demand',
        cellDataLabel: 'Job Demand',
        cell: (row) => (row.kind === 'track' ? <DemandCell track={row.track} /> : null),
      },
      {
        key: 'certs',
        header: 'Certificates',
        cellDataLabel: 'Certificates',
        cell: (row) => (row.kind === 'track' ? row.track.certs : null),
      },
      {
        key: 'apply',
        header: '',
        cellDataLabel: 'Apply',
        cell: (row) =>
          row.kind === 'track' ? (
            <LocalizedLink href={`/apply?program=${row.track.slug}`} className="btn btn-muted" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              Apply
            </LocalizedLink>
          ) : null,
      },
    ],
    [selected, toggle]
  );

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
            <LocalizedLink href="/salary-guide">Salary guide</LocalizedLink> uses the same bands as program pages.
          </li>
        </ol>
        <p className="program-comparison-guide-lead">Pick based on what matters most:</p>
        <ul className="program-comparison-guide-list">
          <li>
            <strong>Time:</strong> Digital Literacy is the fastest on-ramp; most tracks run about 3–5 months at ~10 hours
            a week (your pace may vary).
          </li>
          <li>
            <strong>Difficulty (⭐–⭐⭐⭐):</strong> ⭐ = beginner-friendly. ⭐⭐⭐ = steeper curve, usually higher
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
                  <p className="program-comparison-starter-name">{t.shortName}</p>
                  {extra?.bestFor && <p className="program-comparison-starter-best">{extra.bestFor}</p>}
                  <p className="program-comparison-starter-meta">
                    {t.duration} · {t.difficulty} · {t.salary}
                  </p>
                  <div className="program-comparison-starter-actions">
                    <LocalizedLink href={`/programs/${t.slug}`} className="btn btn-outline btn-sm">
                      Program detail
                    </LocalizedLink>
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
          <LocalizedLink href="/find-your-path">Take the 2-minute quiz</LocalizedLink> for ranked matches →{' '}
          <LocalizedLink href="/programs">browse all 20 programs</LocalizedLink>.
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
          <div className="program-comparison-matrix-wrap" ref={matrixScrollRef}>
            <DataTable<MatrixRow>
              variant="admin"
              tableClassName="program-comparison-matrix"
              scrollX={false}
              columns={matrixColumns}
              rows={matrixRows}
              rowKey={(r) => r.key}
            />
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

      <div className="program-comparison-table-wrap" ref={tableScrollRef}>
        <DataTable<PickRow>
          variant="admin"
          tableClassName="comparison-table program-table program-comparison-table-pick"
          scrollX={false}
          columns={pickColumns}
          rows={pickRows}
          rowKey={(row, i) => (row.kind === 'category' ? `cat-${row.label}-${i}` : row.track.slug)}
          renderBodyRow={(row, _rowIndex, { columnCount }) =>
            row.kind === 'category' ? (
              <tr className="program-comparison-category-row">
                <td colSpan={columnCount}>{row.label}</td>
              </tr>
            ) : null
          }
        />
      </div>

      <ul className="program-cards program-comparison-cards-pick" aria-label="Program comparison cards">
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
                  <LocalizedLink id={`program-card-title-${t.slug}`} href={`/programs/${t.slug}`} className="program-comparison-card__title">
                    {t.shortName}
                  </LocalizedLink>
                  <LocalizedLink href={`/apply?program=${t.slug}`} className="btn btn-muted program-comparison-card__apply" aria-label={`Apply to ${t.shortName}`}>
                    Apply
                  </LocalizedLink>
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
                  <span className="program-comparison-card__certs-label">Certificates</span>
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
