'use client';

import { useMemo, useState } from 'react';
import type { Program } from '@/lib/content/programs';
import ProgramCard from '@/components/programs/ProgramCard';

export default function ProgramsGrid({ programs }: { programs: Program[] }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const categories = useMemo(() => {
    const unique = Array.from(new Map(programs.map((p) => [p.category, p.categoryLabel])).entries());
    return [{ key: 'all', label: 'All' }, ...unique.map(([key, label]) => ({ key, label }))];
  }, [programs]);

  const filteredPrograms = useMemo(
    () => (activeFilter === 'all' ? programs : programs.filter((p) => p.category === activeFilter)),
    [activeFilter, programs]
  );

  return (
    <section className="wa-space-y-8">
      <div className="stitch-pill-row">
        {categories.map((category) => {
          const active = activeFilter === category.key;
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => setActiveFilter(category.key)}
              className="stitch-pill wa-text-xs wa-font-bold wa-uppercase wa-transition-colors wa-cursor-pointer"
              style={active ? { background: 'rgba(173,44,77,0.22)', borderColor: 'rgba(255,178,188,0.28)', color: '#fff2f4' } : undefined}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {filteredPrograms.length === 0 ? (
        <p className="wa-py-8 wa-text-sm stitch-muted">
          No programs found in this category.
        </p>
      ) : (
        <div className="stitch-grid-2">
          {filteredPrograms.map((program, index) => (
            <ProgramCard key={program.slug} program={program} featured={index < 2} />
          ))}
        </div>
      )}
    </section>
  );
}
