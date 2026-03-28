'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PROGRAMS, WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import type { Program } from '@/lib/content/programs';
import { getProgramExtra } from '@/lib/content/programExtras';
import { salaryRangeDisplay } from '@/lib/content/programSalaryOutcomes';
import { ProgramIcon } from '@/components/ProgramIcon';

const programs = PROGRAMS;

const filters = [
  { key: 'all', label: `All Programs (${WORKFORCEAP_PROGRAM_CATALOG_SIZE})` },
  { key: 'digital-literacy', label: 'Digital Literacy (1)' },
  { key: 'ai-software', label: 'AI & Software (2)' },
  { key: 'cloud-data', label: 'Cloud & Data (3)' },
  { key: 'it-cyber', label: 'IT & Cyber (6)' },
  { key: 'business', label: 'Business (3)' },
  { key: 'healthcare', label: 'Healthcare (1)' },
  { key: 'manufacturing', label: 'Manufacturing (3)' },
];

const CATEGORY_BORDER: Record<string, string> = {
  'it-cyber': 'var(--color-blue)',
  'ai-software': 'var(--color-purple)',
  'cloud-data': '#0d9488',
  'business': 'var(--color-green)',
  'healthcare': '#e11d48',
  'manufacturing': '#ea580c',
  'digital-literacy': 'var(--color-gray-500)',
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
      <div className="program-card-header-row">
        <span className="program-card-category-badge" style={{ background: program.categoryColor }}>{program.categoryLabel}</span>
        <span className="program-card-icon-slot"><ProgramIcon program={program} size={28} /></span>
      </div>
      <h3 className="program-card-title">{program.title}</h3>
      {extra?.bestFor && (
        <p className="program-card-best-for">
          <strong>Best for:</strong> {extra.bestFor}
        </p>
      )}
      <div className="program-card-meta">
        <div className="program-card-meta-row">
          <span className="program-card-duration">⏱ {program.duration}</span>
          <span className="program-card-salary">Starting range: {salaryRangeDisplay(program)}</span>
        </div>
        {extra?.jobOutcomes && extra.jobOutcomes.length > 0 && (
          <p className="program-card-outcomes">
            <strong>Roles:</strong> {extra.jobOutcomes.join(' · ')}
          </p>
        )}
        <small className="program-card-salary-note">*Austin-area median based on industry data</small>
      </div>
      {nonEmptySkills.length > 0 ? (
        <div className="program-card-skills">
          {skills.map((s) => (
            <span key={s} className="program-card-skill-tag">{s}</span>
          ))}
          {moreSkills > 0 && (
            <span className="program-card-skill-tag program-card-skill-more">+{moreSkills} more</span>
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
      <div className="program-card-footer">
        <span className="program-card-partner">Partner: {program.partner}</span>
        <div className="program-card-actions">
          <Link href={`/programs/${program.slug}`} className="btn btn-outline btn-sm">View Program</Link>
          <Link href={`/apply?program=${program.slug}`} className="btn btn-primary btn-sm">Apply →</Link>
        </div>
      </div>
    </div>
  );
}

export default function ProgramsContent() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = activeFilter === 'all'
    ? programs
    : programs.filter((p) => p.category === activeFilter);

  return (
    <section className="content-section">
      <div className="container">
        <div className="program-filters">
          {filters.map((f) => (
            <button
              key={f.key}
              className={`filter-chip${activeFilter === f.key ? ' active' : ''}`}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="programs-grid">
          {filtered.map((p) => (
            <ProgramCard key={p.title} program={p} />
          ))}
        </div>
        <p className="programs-salary-disclaimer">
          Bands are Austin-first, grounded in Lightcast/BLS-style data (Jan 2026). Your offer still depends on proof, role, and employer.
        </p>
        <div className="programs-bottom-actions">
          <Link href="/find-your-path" className="btn btn-primary">Not sure? Find Your Career</Link>
          <Link href="/program-comparison" className="btn btn-outline">Compare programs</Link>
          <Link href="/salary-guide" className="btn btn-ghost">Salary guide</Link>
        </div>
      </div>
    </section>
  );
}
