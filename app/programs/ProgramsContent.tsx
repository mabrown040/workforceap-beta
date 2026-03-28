'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PROGRAMS, WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import type { Program } from '@/lib/content/programs';

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
  'it-cyber': '#2b7bb9',
  'ai-software': '#8b4a9b',
  'cloud-data': '#0d9488',
  'business': '#4a9b4f',
  'healthcare': '#e11d48',
  'manufacturing': '#ea580c',
  'digital-literacy': '#6b7280',
};

function ProgramCard({ program, index }: { program: Program; index: number }) {
  const isFeatured = index === 0;

  if (isFeatured) {
    return (
      <div className="md:col-span-8 bg-gradient-to-br from-primary-container to-primary-fixed-variant rounded-xl p-8 flex flex-col justify-between group relative overflow-hidden h-auto min-h-[400px]">
        <div className="relative z-10">
          <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-block">
            Highly Recommended
          </span>
          <h2 className="text-4xl font-black text-white mb-4">{program.title}</h2>
          <p className="text-white/80 text-lg max-w-md">Learn the fundamentals of {program.categoryLabel} through expert-led courses.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between relative z-10 mt-8 gap-6">
          <div className="flex gap-8">
            <div>
              <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest mb-1">Duration</p>
              <p className="text-white font-bold">{program.duration}</p>
            </div>
            <div>
              <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest mb-1">Cost</p>
              <p className="text-white font-bold">$0</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={`/programs/${program.slug}`} className="bg-white/10 text-white border border-white/20 px-6 py-3 rounded-lg font-bold hover:bg-white/20 transition-colors">
              Details
            </Link>
            <Link href={`/apply?program=${program.slug}`} className="bg-white text-primary-fixed-variant px-8 py-3 rounded-lg font-bold hover:scale-105 active:scale-95 transition-transform">
              Apply Now
            </Link>
          </div>
        </div>
        <div className="absolute right-[-10%] bottom-[-10%] opacity-20 w-80 h-80 rounded-full bg-white blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
      </div>
    );
  }

  const isWide = index === 1 || index % 6 === 0;

  return (
    <div className={`${isWide ? 'md:col-span-4' : 'md:col-span-3'} bg-surface-container rounded-xl p-6 flex flex-col justify-between hover:bg-surface-container-high transition-colors group border-l-4`} style={{ borderLeftColor: CATEGORY_BORDER[program.category] || program.categoryColor }}>
      <div>
        <span className="text-primary text-[10px] font-black uppercase tracking-widest mb-3 inline-block">
          {program.categoryLabel}
        </span>
        <h3 className={`font-bold mb-2 text-on-surface ${isWide ? 'text-2xl' : 'text-xl'}`}>{program.title}</h3>
        <p className="text-on-surface-variant text-sm mb-6">Learn the fundamentals of {program.categoryLabel} through expert-led courses.</p>
      </div>
      <div className="mt-auto pt-4 border-t border-outline-variant/15 flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-on-surface font-bold">{program.duration}</span>
          <span className="text-on-surface-variant font-medium">$0 Cost</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Link href={`/programs/${program.slug}`} className="text-on-surface-variant text-xs hover:text-on-surface transition-colors">Details</Link>
          <Link href={`/apply?program=${program.slug}`} className="text-primary font-bold text-sm flex items-center gap-1 hover:brightness-110">
            Apply <span className="material-symbols-outlined text-sm">arrow_forward</span>
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
    <div>
      <div className="flex flex-wrap gap-3 overflow-x-auto pb-4 scrollbar-hide mb-8">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              activeFilter === f.key
                ? 'bg-tertiary-container text-on-tertiary-container'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label.replace(/\s\(\d+\)$/, '')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {filtered.map((p, i) => (
          <ProgramCard key={p.title} program={p} index={i} />
        ))}
      </div>

      <p className="text-center mt-12 text-sm text-on-surface-variant max-w-2xl mx-auto">
        Bands are Austin-first, grounded in Lightcast/BLS-style data (Jan 2026). Your offer still depends on proof, role, and employer.
      </p>

      <div className="flex justify-center gap-4 mt-8 flex-wrap">
        <Link href="/find-your-path" className="bg-primary text-on-primary px-6 py-3 rounded-lg font-bold text-sm">Not sure? Find Your Career</Link>
        <Link href="/program-comparison" className="bg-surface-container text-on-surface px-6 py-3 rounded-lg font-bold text-sm border border-outline-variant/20 hover:bg-surface-container-high transition-colors">Compare programs</Link>
      </div>
    </div>
  );
}
