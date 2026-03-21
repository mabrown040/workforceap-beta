'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PROGRAMS } from '@/lib/content/programs';
import type { Program } from '@/lib/content/programs';
import { getProgramExtra } from '@/lib/content/programExtras';
import { salaryRangeDisplay } from '@/lib/content/programSalaryOutcomes';
import { ProgramIcon } from '@/components/ProgramIcon';

const programs = PROGRAMS;

const filters = [
  { key: 'all', label: 'All Programs (19)' },
  { key: 'digital-literacy', label: 'Digital Literacy (1)' },
  { key: 'ai-software', label: 'AI & Software (2)' },
  { key: 'cloud-data', label: 'Cloud & Data (3)' },
  { key: 'it-cyber', label: 'IT & Cyber (6)' },
  { key: 'business', label: 'Business (3)' },
  { key: 'healthcare', label: 'Healthcare (1)' },
  { key: 'manufacturing', label: 'Manufacturing (3)' },
];

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
  const skills = program.skills.slice(0, 3);
  const moreSkills = program.skills.length - 3;
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
        <div style={{ display: 'flex', gap: '1rem', fontSize: '.85rem', color: '#666' }}>
          <span>⏱ {program.duration}</span>
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Starting range: {salaryRangeDisplay(program)}</span>
        </div>
        {extra?.jobOutcomes && extra.jobOutcomes.length > 0 && (
          <p className="program-card-outcomes">
            <strong>Roles:</strong> {extra.jobOutcomes.join(' · ')}
          </p>
        )}
        <small style={{ display: 'block', fontSize: '.75rem', color: '#888', marginTop: '.25rem' }}>*Austin-area median based on industry data</small>
      </div>
      <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
        {skills.map((s) => (
          <span key={s} style={{ background: '#f0f0f0', padding: '.25rem .6rem', borderRadius: '4px', fontSize: '.8rem', display: 'inline-block' }}>{s}</span>
        ))}
        {moreSkills > 0 && (
          <span style={{ background: '#e5e5e5', color: '#737373', padding: '.25rem .6rem', borderRadius: '4px', fontSize: '.8rem', display: 'inline-block' }}>+{moreSkills} more</span>
        )}
      </div>
      <details style={{ marginBottom: '1rem' }} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '.9rem', color: '#1a1a1a' }}>
          {open ? 'Hide' : 'View'} {count} course{count !== 1 ? 's' : ''}
        </summary>
        <ul style={{ listStyle: 'none', padding: '.75rem 0 0', margin: 0 }}>
          {program.courses.map((c) => (
            <li key={c.slug} style={{ fontSize: '.85rem', color: '#555', padding: '.3rem 0', borderBottom: '1px solid #f0f0f0' }}>{c.name}</li>
          ))}
        </ul>
      </details>
      <div
        className="program-card-footer"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ fontSize: '.8rem', color: '#888' }}>Partner: {program.partner}</span>
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
        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '.85rem', color: '#666', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
          Bands are Austin-first, grounded in Lightcast/BLS-style data (Jan 2026). Your offer still depends on proof, role, and employer.
        </p>
        <div className="programs-bottom-actions">
          <Link href="/find-your-path" className="btn btn-primary">Not sure? Take the pathfinder quiz</Link>
          <Link href="/program-comparison" className="btn btn-outline">Compare programs</Link>
          <Link href="/salary-guide" className="btn btn-ghost">Salary guide</Link>
        </div>
      </div>
    </section>
  );
}
