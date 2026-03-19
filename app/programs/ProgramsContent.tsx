'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PROGRAMS } from '@/lib/content/programs';
import type { Program } from '@/lib/content/programs';
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
  const count = program.courses.length;
  const skills = program.skills.slice(0, 3);
  const moreSkills = program.skills.length - 3;
  const borderColor = CATEGORY_BORDER[program.category] ?? program.borderColor;

  return (
    <div className="program-card" data-category={program.category} style={{ borderLeft: `4px solid ${borderColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ background: program.categoryColor, color: 'white', padding: '.3rem .75rem', borderRadius: '50px', fontSize: '.75rem', fontWeight: 600 }}>{program.categoryLabel}</span>
          <span className="program-card-free-badge">100% Free</span>
        </div>
        <span style={{ display: 'flex', alignItems: 'center' }}><ProgramIcon program={program} size={28} /></span>
      </div>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '.5rem' }}>{program.title}</h3>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '.75rem', fontSize: '.85rem', color: '#666' }}>
        <span>⏱ {program.duration}</span>
        <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{program.salary}</span>
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '.8rem', color: '#888' }}>Partner: {program.partner}</span>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <Link href={`/programs/${program.slug}`} className="btn btn-outline" style={{ padding: '.5rem 1rem', fontSize: '.85rem' }}>View Program</Link>
          <Link href={`/apply?program=${program.slug}`} className="btn btn-primary" style={{ padding: '.5rem 1rem', fontSize: '.85rem' }}>Apply →</Link>
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
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <Link href="/salary-guide" className="btn btn-outline">View Salary Guide</Link>
          &nbsp;&nbsp;
          <Link href="/program-comparison" className="btn btn-outline">Compare Programs</Link>
        </div>
      </div>
    </section>
  );
}
