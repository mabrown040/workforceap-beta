'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type ProgramCard = {
  cat: string;
  title: string;
  dur: string;
  slug: string;
};

type ProgramsPageClientProps = {
  programs: ProgramCard[];
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export default function ProgramsPageClient({ programs }: ProgramsPageClientProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(programs.map((program) => program.cat)));
    return ['all', ...unique];
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    const normalizedQuery = normalize(query);

    return programs.filter((program) => {
      const matchesCategory = activeCategory === 'all' || program.cat === activeCategory;
      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        normalize(program.title).includes(normalizedQuery) ||
        normalize(program.cat).includes(normalizedQuery) ||
        normalize(program.dur).includes(normalizedQuery) ||
        normalize(program.slug).includes(normalizedQuery)
      );
    });
  }, [activeCategory, programs, query]);

  const clearFilters = () => {
    setQuery('');
    setActiveCategory('all');
  };

  const hasActiveFilters = query.length > 0 || activeCategory !== 'all';

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="program-search"
          style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}
        >
          Search programs
        </label>
        <input
          id="program-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by program, category, or duration"
          style={{
            width: '100%',
            minHeight: '44px',
            padding: '0.75rem 1rem',
            borderRadius: '9999px',
            border: '1px solid rgba(222,191,194,0.25)',
            background: 'var(--color-white, #fff)',
            color: 'var(--color-on-surface)',
            outline: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '0.5rem',
          marginBottom: '1rem',
          paddingBottom: '0.25rem',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {categories.map((category) => {
          const active = activeCategory === category;
          const label = category === 'all' ? 'All Programs' : category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              style={{
                flexShrink: 0,
                padding: '0.625rem 1rem',
                minHeight: '44px',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                border: active ? '1px solid var(--color-accent)' : '1px solid rgba(222,191,194,0.2)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                background: active ? 'var(--color-accent)' : 'var(--surface-container-low)',
                color: active ? 'var(--color-white, #fff)' : 'var(--color-on-surface-variant)',
              }}
            >
              {label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          style={{
            flexShrink: 0,
            padding: '0.625rem 1rem',
            minHeight: '44px',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.02em',
            border: '1px solid rgba(222,191,194,0.2)',
            cursor: hasActiveFilters ? 'pointer' : 'default',
            display: 'inline-flex',
            alignItems: 'center',
            background: 'transparent',
            color: hasActiveFilters ? 'var(--color-accent-dark)' : 'var(--color-on-surface-variant)',
            opacity: hasActiveFilters ? 1 : 0.55,
          }}
        >
          Clear filters
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
          Showing {filteredPrograms.length} of {programs.length} programs
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
        {filteredPrograms.length > 0 ? (
          filteredPrograms.map((program) => (
            <Link
              href={`/programs/${program.slug}`}
              key={program.slug}
              style={{
                borderRadius: '0.75rem',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid rgba(222,191,194,0.15)',
                background: 'var(--color-white, #fff)',
                minHeight: 192,
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'block',
                    marginBottom: '0.25rem',
                    color: 'var(--color-accent)',
                  }}
                >
                  {program.cat}
                </span>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.25, margin: 0, color: 'var(--color-on-surface)' }}>
                  {program.title}
                </h3>
              </div>
              <div style={{ marginTop: 'auto' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, marginBottom: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                  {program.dur}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'rgba(173,44,77,0.15)',
                      color: 'var(--color-accent-dark)',
                    }}
                  >
                    $0
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-accent-dark)' }}>
                    arrow_outward
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div
            style={{
              gridColumn: '1 / -1',
              borderRadius: '0.75rem',
              border: '1px solid rgba(222,191,194,0.15)',
              background: 'var(--color-white, #fff)',
              padding: '1.25rem',
              color: 'var(--color-on-surface-variant)',
              textAlign: 'center',
            }}
          >
            No programs match your filters.
          </div>
        )}
      </div>
    </section>
  );
}
