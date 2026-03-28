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
      <div className="wa-flex wa-flex-wrap wa-gap-2 md:wa-gap-3">
        {categories.map((category) => {
          const active = activeFilter === category.key;
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => setActiveFilter(category.key)}
              className="wa-text-xs wa-font-bold wa-uppercase wa-px-3 wa-py-2 md:wa-px-4 md:wa-py-2.5 wa-border wa-rounded-none wa-transition-colors wa-cursor-pointer"
              style={{
                letterSpacing: '0.08em',
                background: active ? 'rgba(173,44,77,0.2)' : '#1c1b1b',
                color: active ? '#ffb2bc' : '#debfc2',
                borderColor: active ? '#ad2c4d' : 'rgba(88,65,68,0.5)',
              }}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {filteredPrograms.length === 0 ? (
        <p className="wa-py-8 wa-text-sm" style={{ color: '#debfc2' }}>
          No programs found in this category.
        </p>
      ) : (
        <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-2 wa-gap-4 md:wa-gap-5">
          {filteredPrograms.map((program, index) => (
            <ProgramCard key={program.slug} program={program} featured={index < 2} />
          ))}
        </div>
      )}
    </section>
  );
}
