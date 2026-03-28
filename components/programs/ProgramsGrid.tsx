'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Program } from '@/lib/content/programs';

const CATEGORIES = [
  { key: 'all', label: 'All Programs' },
  { key: 'ai-software', label: 'AI & Software Dev' },
  { key: 'cloud-data', label: 'Cloud & Data' },
  { key: 'it-cyber', label: 'IT & Cybersecurity' },
  { key: 'business', label: 'Business' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'manufacturing', label: 'Manufacturing' },
  { key: 'digital-literacy', label: 'Digital Literacy' },
];

/* ── Featured Hero Card ──────────────────────────────────── */
function FeaturedCard({ program }: { program: Program }) {
  return (
    <Link
      href={`/programs/${program.slug}`}
      className="wa-col-span-1 md:wa-col-span-8 wa-rounded-xl wa-p-8 wa-flex wa-flex-col wa-justify-between wa-group wa-cursor-pointer wa-relative wa-overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom right, #ad2c4d, #670024)',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textDecoration: 'none',
      }}
    >
      <div className="wa-relative wa-z-10">
        <span
          className="wa-inline-block wa-mb-4 wa-rounded-full wa-text-white wa-font-black wa-uppercase"
          style={{
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(12px)',
            padding: '4px 16px',
            fontSize: 10,
            letterSpacing: '0.2em',
          }}
        >
          Featured
        </span>
        <h2 className="wa-text-4xl wa-font-black wa-text-white wa-mb-4">{program.title}</h2>
        <p className="wa-text-white/80 wa-text-lg" style={{ maxWidth: 420 }}>
          {program.skills.slice(0, 4).join(' · ')}
        </p>
      </div>
      <div className="wa-flex wa-items-end wa-justify-between wa-relative wa-z-10">
        <div className="wa-flex wa-gap-8">
          <div>
            <p className="wa-text-white/60 wa-font-bold wa-uppercase wa-mb-1" style={{ fontSize: 10, letterSpacing: '0.2em' }}>Duration</p>
            <p className="wa-text-white wa-font-bold">{program.duration}</p>
          </div>
          <div>
            <p className="wa-text-white/60 wa-font-bold wa-uppercase wa-mb-1" style={{ fontSize: 10, letterSpacing: '0.2em' }}>Cost</p>
            <p className="wa-text-white wa-font-bold">$0</p>
          </div>
        </div>
        <span
          className="wa-rounded-lg wa-font-bold"
          style={{ background: '#fff', color: '#670024', padding: '12px 32px' }}
        >
          Apply Now
        </span>
      </div>
      {/* glow */}
      <div
        className="wa-absolute wa-rounded-full wa-blur-3xl"
        style={{ right: '-10%', bottom: '-10%', opacity: 0.2, width: 320, height: 320, background: '#fff' }}
      />
    </Link>
  );
}

/* ── Standard Card (medium) ──────────────────────────────── */
function MediumCard({ program }: { program: Program }) {
  return (
    <div
      className="wa-rounded-xl wa-p-6 wa-flex wa-flex-col wa-justify-between wa-transition-colors"
      style={{ background: 'var(--programs-card-bg)', minHeight: 260 }}
    >
      <div>
        <span className="wa-inline-block wa-mb-3 wa-font-black wa-uppercase" style={{ color: '#ffb2bc', fontSize: 10, letterSpacing: '0.2em' }}>
          {program.categoryLabel}
        </span>
        <h3 className="wa-text-xl wa-font-bold wa-mb-2" style={{ color: 'var(--programs-text)' }}>
          {program.title}
        </h3>
        <p className="wa-text-sm wa-mb-6" style={{ color: 'var(--programs-text-secondary)' }}>
          {program.skills.slice(0, 3).join(' · ')}
        </p>
      </div>
      <div className="wa-flex wa-items-center wa-justify-between wa-pt-4" style={{ borderTop: '1px solid rgba(88,65,68,0.15)' }}>
        <span className="wa-text-xs" style={{ color: 'var(--programs-text-secondary)' }}>
          {program.duration} • $0
        </span>
        <Link
          href={`/programs/${program.slug}`}
          className="wa-font-bold wa-text-sm wa-flex wa-items-center wa-gap-1"
          style={{ color: '#ffb2bc', textDecoration: 'none' }}
        >
          Apply →
        </Link>
      </div>
    </div>
  );
}

/* ── Compact Card (small) ────────────────────────────────── */
function CompactCard({ program }: { program: Program }) {
  return (
    <div
      className="wa-rounded-xl wa-p-6 wa-transition-all"
      style={{ background: 'var(--programs-card-bg)' }}
    >
      <h4 className="wa-font-bold wa-mb-1" style={{ color: 'var(--programs-text)' }}>{program.title}</h4>
      <p className="wa-text-xs wa-mb-4" style={{ color: 'var(--programs-text-secondary)' }}>
        {program.duration} • $0
      </p>
      <Link
        href={`/programs/${program.slug}`}
        className="wa-font-bold wa-uppercase wa-text-xs"
        style={{ color: '#ffb2bc', letterSpacing: '0.2em', textDecoration: 'none' }}
      >
        Apply Now
      </Link>
    </div>
  );
}

/* ── Sidebar card (used next to featured) ────────────────── */
function SidebarCard({ program }: { program: Program }) {
  return (
    <div
      className="wa-rounded-xl wa-p-8 wa-flex wa-flex-col wa-justify-between wa-transition-colors"
      style={{ background: 'var(--programs-card-bg)', minHeight: '100%' }}
    >
      <div>
        <span className="wa-inline-block wa-mb-4 wa-font-black wa-uppercase" style={{ color: '#ffb2bc', fontSize: 10, letterSpacing: '0.2em' }}>
          {program.categoryLabel}
        </span>
        <h3 className="wa-text-2xl wa-font-bold wa-mb-2" style={{ color: 'var(--programs-text)' }}>
          {program.title}
        </h3>
        <p className="wa-text-sm" style={{ color: 'var(--programs-text-secondary)' }}>
          {program.skills.slice(0, 3).join(' · ')}
        </p>
      </div>
      <div className="wa-mt-8">
        <div className="wa-flex wa-justify-between wa-items-center wa-mb-6">
          <span className="wa-font-bold" style={{ color: 'var(--programs-text)' }}>{program.duration}</span>
          <span className="wa-font-medium" style={{ color: 'var(--programs-text-secondary)' }}>$0 Cost</span>
        </div>
        <Link
          href={`/apply?program=${program.slug}`}
          className="wa-block wa-w-full wa-text-center wa-py-3 wa-rounded-lg wa-font-bold wa-transition-all"
          style={{ background: '#ad2c4d', color: '#fff', textDecoration: 'none' }}
        >
          Apply Now
        </Link>
      </div>
    </div>
  );
}

/* ── Main Grid ───────────────────────────────────────────── */
export default function ProgramsGrid({ programs }: { programs: Program[] }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered =
    activeFilter === 'all'
      ? programs
      : programs.filter((p) => p.category === activeFilter);

  // First program = featured, second = sidebar, next 3 = medium row, rest = compact
  const featured = filtered[0];
  const sidebar = filtered[1];
  const mediumCards = filtered.slice(2, 5);
  const compactCards = filtered.slice(5);

  return (
    <>
      {/* CSS custom properties for light/dark */}
      <style>{`
        :root {
          --programs-bg: #ffffff;
          --programs-text: #1a1a1a;
          --programs-text-secondary: #737373;
          --programs-card-bg: #f5f5f5;
          --programs-card-bg-hover: #ebebeb;
          --programs-pill-bg: #e5e5e5;
          --programs-pill-text: #525252;
          --programs-pill-active-bg: #006d3e;
          --programs-pill-active-text: #92ecb1;
        }
        .dark {
          --programs-bg: #141313;
          --programs-text: #e6e1e1;
          --programs-text-secondary: #debfc2;
          --programs-card-bg: #201f1f;
          --programs-card-bg-hover: #2b2a2a;
          --programs-pill-bg: #201f1f;
          --programs-pill-text: #debfc2;
          --programs-pill-active-bg: #006d3e;
          --programs-pill-active-text: #92ecb1;
        }
      `}</style>

      {/* Category Filter Pills */}
      <div className="wa-flex wa-flex-wrap wa-gap-3 wa-overflow-x-auto wa-pb-4" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveFilter(cat.key)}
            className="wa-px-6 wa-py-3 wa-rounded-full wa-text-xs wa-font-bold wa-uppercase wa-transition-all wa-border-0 wa-cursor-pointer"
            style={{
              letterSpacing: '0.15em',
              background: activeFilter === cat.key ? 'var(--programs-pill-active-bg)' : 'var(--programs-pill-bg)',
              color: activeFilter === cat.key ? 'var(--programs-pill-active-text)' : 'var(--programs-pill-text)',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Bento Grid */}
      {filtered.length === 0 ? (
        <p className="wa-text-center wa-py-16" style={{ color: 'var(--programs-text-secondary)' }}>
          No programs found in this category.
        </p>
      ) : (
        <div
          className="wa-grid wa-grid-cols-1 md:wa-grid-cols-12 wa-gap-6"
          style={{ marginTop: 24 }}
        >
          {/* Featured + Sidebar */}
          {featured && <FeaturedCard program={featured} />}
          {sidebar && (
            <div className="wa-col-span-1 md:wa-col-span-4">
              <SidebarCard program={sidebar} />
            </div>
          )}

          {/* Medium cards row */}
          {mediumCards.map((p) => (
            <div key={p.slug} className="wa-col-span-1 md:wa-col-span-4">
              <MediumCard program={p} />
            </div>
          ))}

          {/* Compact cards - 4 per row */}
          {compactCards.map((p) => (
            <div key={p.slug} className="wa-col-span-1 md:wa-col-span-3">
              <CompactCard program={p} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
