'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PROGRAMS, WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import type { Program } from '@/lib/content/programs';
import { getProgramExtra } from '@/lib/content/programExtras';
import { salaryRangeDisplay } from '@/lib/content/programSalaryOutcomes';
import { ProgramIcon } from '@/components/ProgramIcon';
import { programMatchesSearchQuery } from '@/lib/content/programCatalogSearch';
import {
  PROGRAM_SUBGROUPS,
  orderedSubgroupIdsWithPrograms,
  subgroupForProgram,
  type ProgramSubgroupId,
} from '@/lib/content/programSubgroup';

const programs = PROGRAMS;

function subgroupCounts(): Record<ProgramSubgroupId, number> {
  const m = {} as Record<ProgramSubgroupId, number>;
  for (const p of PROGRAMS) {
    const sg = subgroupForProgram(p);
    m[sg] = (m[sg] ?? 0) + 1;
  }
  return m;
}

const CATEGORY_BORDER: Record<string, string> = {
  'it-cyber': '#2b7bb9',
  'ai-software': '#8b4a9b',
  'cloud-data': '#0d9488',
  'business': '#4a9b4f',
  'healthcare': '#e11d48',
  'manufacturing': '#ea580c',
  'digital-literacy': '#6b7280',
};

function ProgramCard({ program }: { program: Program }) {
  const [open, setOpen] = useState(false);
  const extra = getProgramExtra(program.slug);
  const count = program.courses.length;
  const nonEmptySkills = program.skills.filter((s) => s.trim().length > 0);
  const skills = nonEmptySkills.slice(0, 3);
  const moreSkills = nonEmptySkills.length - 3;
  const borderColor = CATEGORY_BORDER[program.category] ?? program.borderColor;

  return (
    <div className="program-card" data-category={program.category} style={{ borderLeft: `4px solid ${borderColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <span style={{ background: program.categoryColor, color: 'white', padding: '.3rem .75rem', borderRadius: '50px', fontSize: '.75rem', fontWeight: 600 }}>{program.categoryLabel}</span>
        <span style={{ display: 'flex', alignItems: 'center' }}><ProgramIcon program={program} size={28} /></span>
      </div>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '.5rem' }}>{program.title}</h3>
      {extra?.bestFor && (
        <p className="program-card-best-for">
          <strong>Best for:</strong> {extra.bestFor}
        </p>
      )}
      <div style={{ marginBottom: '.75rem' }}>
        <div
          className="program-card-meta-row"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.25rem', fontSize: '0.9rem' }}
        >
          <span>⏱ {program.duration}</span>
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Starting range: {salaryRangeDisplay(program)}</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
          Salary range is Austin market estimate (Lightcast/BLS, Jan 2026). Actual pay depends on experience and employer.
        </p>
        {extra?.jobOutcomes && extra.jobOutcomes.length > 0 && (
          <p className="program-card-outcomes">
            <strong>Roles:</strong> {extra.jobOutcomes.join(' · ')}
          </p>
        )}
        <small style={{ display: 'block', fontSize: '.75rem', color: 'var(--color-on-surface-variant)', marginTop: '.25rem' }}>

        </small>
      </div>
      {nonEmptySkills.length > 0 ? (
        <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
          {skills.map((s) => (
            <span
              key={s}
              className="program-card-skill-tag"
              style={{
                background: 'var(--surface-container)',
                color: 'var(--color-on-surface)',
                padding: '.25rem .6rem',
                borderRadius: '4px',
                fontSize: '.8rem',
                display: 'inline-block',
              }}
            >
              {s}
            </span>
          ))}
          {moreSkills > 0 && (
            <span
              style={{
                background: 'var(--surface-container-high)',
                color: 'var(--color-on-surface-variant)',
                padding: '.25rem .6rem',
                borderRadius: '4px',
                fontSize: '.8rem',
                display: 'inline-block',
              }}
            >
              +{moreSkills} more
            </span>
          )}
        </div>
      ) : null}
      <details style={{ marginBottom: '1rem' }} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="program-card-courses-summary">
          {open ? 'Hide' : 'View'} {count} {count === 1 ? 'course' : 'courses'}
        </summary>
        <ul className="program-card-courses-list">
          {program.courses.map((c) => (
            <li key={c.slug}>{c.name}</li>
          ))}
        </ul>
      </details>
      <div
        className="program-card-footer"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ fontSize: '.8rem', color: 'var(--color-on-surface-variant)' }}>Partner: {program.partner}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
          <Link href={`/programs/${program.slug}`} className="btn btn-outline" style={{ padding: '.5rem 1rem', fontSize: '.85rem' }}>
            View Program
          </Link>
          <Link href={`/apply?program=${program.slug}`} className="btn btn-primary" style={{ padding: '.5rem 1rem', fontSize: '.85rem' }}>
            Apply →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ProgramsContent({ sectionId = 'program-catalog' }: { sectionId?: string | null }) {
  const [activeSubgroup, setActiveSubgroup] = useState<ProgramSubgroupId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => subgroupCounts(), []);
  const subgroupOrder = useMemo(() => orderedSubgroupIdsWithPrograms(PROGRAMS), []);

  const filterChips = useMemo((): { key: ProgramSubgroupId | 'all'; label: string }[] => {
    const chips: { key: ProgramSubgroupId | 'all'; label: string }[] = [
      { key: 'all', label: `All programs (${WORKFORCEAP_PROGRAM_CATALOG_SIZE})` },
    ];
    for (const id of subgroupOrder) {
      const meta = PROGRAM_SUBGROUPS.find((s) => s.id === id);
      const n = counts[id] ?? 0;
      if (!meta || n === 0) continue;
      chips.push({ key: id, label: `${meta.shortLabel} (${n})` });
    }
    return chips;
  }, [counts, subgroupOrder]);

  const filtered = useMemo(() => {
    const bySubgroup =
      activeSubgroup === 'all'
        ? programs
        : programs.filter((p) => subgroupForProgram(p) === activeSubgroup);
    return bySubgroup.filter((p) => programMatchesSearchQuery(p, searchQuery));
  }, [activeSubgroup, searchQuery]);

  return (
    <section id={sectionId ?? undefined} className="content-section">
      <div className="container">
        <div className="program-catalog-search-row" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="program-catalog-search" className="sr-only">
            Search programs
          </label>
          <input
            id="program-catalog-search"
            type="search"
            className="program-catalog-search-input"
            placeholder="Search programs by name, skill, partner, or topic…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="program-filters">
          {filterChips.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`filter-chip${activeSubgroup === f.key ? ' active' : ''}`}
              onClick={() => setActiveSubgroup(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {activeSubgroup === 'all' && searchQuery.trim() === '' ? (
          <div style={{ marginBottom: '2.5rem' }}>
            {subgroupOrder.map((sgId) => {
              const meta = PROGRAM_SUBGROUPS.find((s) => s.id === sgId);
              const inGroup = programs.filter((p) => subgroupForProgram(p) === sgId);
              if (!meta || inGroup.length === 0) return null;
              return (
                <div
                  key={sgId}
                  id={`subgroup-${sgId}`}
                  style={{
                    scrollMarginTop: '6rem',
                    marginBottom: '2.5rem',
                    paddingBottom: '2rem',
                    borderBottom: '1px solid var(--outline-variant)',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: 'var(--color-on-surface)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    {meta.label}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', maxWidth: '42rem', marginBottom: '1.25rem' }}>
                    {meta.description}
                  </p>
                  <div className="programs-grid">
                    {inGroup.map((p) => (
                      <ProgramCard key={p.slug} program={p} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : filtered.length === 0 ? (
          <div
            role="status"
            style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-container-low)',
            }}
          >
            <p style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
              No programs match your filters.
            </p>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
              Try a different keyword or clear the search and category filters to see the full catalog.
            </p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setSearchQuery('');
                setActiveSubgroup('all');
              }}
            >
              Clear search and filters
            </button>
          </div>
        ) : (
        <div className="programs-grid">
          {filtered.map((p) => (
            <ProgramCard key={p.slug} program={p} />
          ))}
        </div>
        )}
        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '.85rem', color: 'var(--color-on-surface-variant)', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
          Bands are grounded in Lightcast/BLS-style data (Jan 2026). Your offer still depends on proof, role, and employer.
        </p>
        <div className="programs-bottom-actions">
          <Link href="/find-your-path" className="btn btn-primary">Find Your Career Path — Take the Quiz</Link>
          <Link href="/program-comparison" className="btn btn-outline">Compare Programs</Link>
          <Link href="/salary-guide" className="btn btn-ghost">View Salary Guide</Link>
        </div>
      </div>
    </section>
  );
}
