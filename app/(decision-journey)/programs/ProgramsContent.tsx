'use client';

import { useMemo, useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';
import { useTranslations } from 'next-intl';
import {
  PROGRAMS,
  WORKFORCEAP_PROGRAM_CATALOG_SIZE,
  getProgramDisplayPartner,
  getProgramDisplayTitle,
} from '@/lib/content/programs';
import type { Program, LanguageSupport, LanguageSupportLevel } from '@/lib/content/programs';
import { getProgramExtra } from '@/lib/content/programExtras';
import { salaryRangeDisplay } from '@/lib/content/programSalaryOutcomes';
import { ProgramIcon } from '@/components/ProgramIcon';
import FundingBadge from '@/components/FundingBadge';
import { programMatchesSearchQuery } from '@/lib/content/programCatalogSearch';
import {
  PROGRAM_SUBGROUPS,
  orderedSubgroupIdsWithPrograms,
  subgroupForProgram,
  type ProgramSubgroupId,
} from '@/lib/content/programSubgroup';

// Product stake: keep the full catalog visually open when browsing all programs.
// Do not reintroduce dropdown/accordion browsing for the main public catalog without approval.
const programs = PROGRAMS;

const STARTER_PROGRAM_SLUGS = [
  'digital-literacy-empowerment-class',
  'it-support-professional-certificate-ibm',
  'project-management-professional-certificate-microsoft',
];

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
  'it-cyber-entry': '#2b7bb9',
  'ai-software': '#8b4a9b',
  'cloud-data': '#0d9488',
  'business': '#4a9b4f',
  'healthcare': '#e11d48',
  'manufacturing': '#ea580c',
  'digital-literacy': '#6b7280',
};

function LanguagePills({ languages }: { languages?: LanguageSupport }) {
  const tPrograms = useTranslations('marketing.programs');
  const tCommon = useTranslations('common');
  if (!languages) return null;

  const entries: { code: keyof LanguageSupport; level: LanguageSupportLevel; label: string }[] = [
    { code: 'es', level: languages.es, label: tCommon('languageEs') },
    { code: 'pt', level: languages.pt, label: tCommon('languagePt') },
    { code: 'fr', level: languages.fr, label: tCommon('languageFr') },
  ];

  const active = entries.filter((e) => e.level !== 'none');
  if (active.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginBottom: '.75rem' }}>
      {active.map((e) => {
        let text: string;
        if (e.level === 'full') text = tPrograms('languageFull', { language: e.label });
        else if (e.level === 'subtitles') text = tPrograms('languageSubtitles', { language: e.label });
        else text = tPrograms('languageAuto', { language: e.label });
        return (
          <span
            key={e.code}
            style={{
              background: 'var(--surface-container-high)',
              color: 'var(--color-on-surface-variant)',
              padding: '.2rem .55rem',
              borderRadius: '50px',
              fontSize: '.72rem',
              fontWeight: 500,
              border: '1px solid var(--outline-variant)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            🌐 {text}
          </span>
        );
      })}
    </div>
  );
}

function ProgramCard({ program }: { program: Program }) {
  const t = useTranslations('marketing.programs');
  const [open, setOpen] = useState(false);
  const extra = getProgramExtra(program.slug);
  const count = program.courses.length;
  const nonEmptySkills = program.skills.filter((s) => s.trim().length > 0);
  const skills = nonEmptySkills.slice(0, 3);
  const moreSkills = nonEmptySkills.length - 3;
  const borderColor = CATEGORY_BORDER[program.category] ?? program.borderColor;
  const displayTitle = getProgramDisplayTitle(program);
  const displayPartner = getProgramDisplayPartner(program);

  return (
    <div className="program-card" data-category={program.category} style={{ borderLeft: `4px solid ${borderColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ background: program.categoryColor, color: 'white', padding: '.3rem .75rem', borderRadius: '50px', fontSize: '.75rem', fontWeight: 600 }}>{program.categoryLabel}</span>
          <FundingBadge source={program.fundingSource} />
        </div>
        <span style={{ display: 'flex', alignItems: 'center' }}><ProgramIcon program={program} size={28} /></span>
      </div>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '.5rem' }}>{displayTitle}</h3>
      <LanguagePills languages={program.languagesSupported} />
      {extra?.bestFor && (
        <p className="program-card-best-for">
          <strong>{t('cardBestFor')}</strong> {extra.bestFor}
        </p>
      )}
      <div style={{ marginBottom: '.75rem' }}>
        <div
          className="program-card-meta-row"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.25rem', fontSize: '0.9rem' }}
        >
          <span>⏱ {program.duration}</span>
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{t('cardStartingRange')} {salaryRangeDisplay(program)}</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
          {t('cardSalaryDisclaimer')}
        </p>
        {extra?.jobOutcomes && extra.jobOutcomes.length > 0 && (
          <p className="program-card-outcomes">
            <strong>{t('cardRolesLabel')}</strong> {extra.jobOutcomes.join(' · ')}
          </p>
        )}
      </div>
      {nonEmptySkills.length > 0 ? (
        <div className="program-card-skills" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
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
      <details className="program-card-courses" style={{ marginBottom: '1rem' }} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
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
        <span style={{ fontSize: '.8rem', color: 'var(--color-on-surface-variant)' }}>Partner: {displayPartner}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
          <LocalizedLink href={`/programs/${program.slug}`} className="btn btn-outline" style={{ padding: '.5rem 1rem', fontSize: '.85rem' }}>
            View Program
          </LocalizedLink>
          <LocalizedLink href={`/apply?program=${program.slug}`} className="btn btn-primary" style={{ padding: '.5rem 1rem', fontSize: '.85rem' }}>
            Get Started →
          </LocalizedLink>
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

  const starterPrograms = useMemo(() => STARTER_PROGRAM_SLUGS
    .map((slug) => programs.find((p) => p.slug === slug))
    .filter((p): p is Program => Boolean(p)), []);

  const filtered = useMemo(() => {
    const bySubgroup =
      activeSubgroup === 'all'
        ? programs
        : programs.filter((p) => subgroupForProgram(p) === activeSubgroup);
    return bySubgroup.filter((p) => programMatchesSearchQuery(p, searchQuery));
  }, [activeSubgroup, searchQuery]);

  const t = useTranslations('marketing.programs');

  return (
    <section id={sectionId ?? undefined} className="content-section">
      <div className="container">
        <div className="program-catalog-intro" style={{ marginBottom: '1.25rem' }}>
          <h2 className="text-display-sm" style={{ margin: '0 0 0.5rem', color: 'var(--color-on-surface)' }}>
            {t('catalogTitle', { count: WORKFORCEAP_PROGRAM_CATALOG_SIZE })}
          </h2>
          <p
            className="program-catalog-lead program-catalog-lead--desktop"
            style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6, maxWidth: '42rem' }}
          >
            {t('catalogLead')}
          </p>
          <p
            className="program-catalog-lead program-catalog-lead--mobile"
            style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6, maxWidth: '42rem' }}
          >
            {t('catalogLeadMobile')}
          </p>
        </div>
        <div className="program-catalog-search-row" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="program-catalog-search" className="sr-only">
            Search programs
          </label>
          <input
            id="program-catalog-search"
            type="search"
            className="program-catalog-search-input"
            placeholder={t('catalogSearchPlaceholder')}
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
            <section className="programs-starter-section" aria-labelledby="programs-starter-heading">
              <div className="programs-starter-heading-row">
                <div>
                  <p className="text-label-upper" style={{ color: 'var(--color-accent)', margin: '0 0 0.35rem' }}>Start here</p>
                  <h3 id="programs-starter-heading" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-on-surface)', margin: 0 }}>
                    Not sure which one fits? Start with these three.
                  </h3>
                </div>
                <LocalizedLink href="/find-your-path" className="btn btn-primary">Take the 2-minute quiz</LocalizedLink>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--color-on-surface-variant)', maxWidth: '44rem', lineHeight: 1.6, margin: '0.75rem 0 1rem' }}>
                These are the safest first choices for members who are new, want the fastest job path, or prefer a business-friendly route.
              </p>
              <div className="programs-grid">
                {starterPrograms.map((p) => (
                  <ProgramCard key={p.slug} program={p} />
                ))}
              </div>
              <a href="#all-programs" className="programs-see-all-link">See all {WORKFORCEAP_PROGRAM_CATALOG_SIZE} programs ↓</a>
            </section>
            <div id="all-programs" style={{ scrollMarginTop: '6rem' }} />
            {/* Product stake: keep program groups fully expanded so members can browse visually without understanding dropdowns. */}
            {subgroupOrder.map((sgId) => {
              const meta = PROGRAM_SUBGROUPS.find((s) => s.id === sgId);
              const inGroup = programs.filter((p) => subgroupForProgram(p) === sgId);
              if (!meta || inGroup.length === 0) return null;
              return (
                <section
                  key={sgId}
                  id={`subgroup-${sgId}`}
                  className="programs-subgroup-section"
                  style={{
                    scrollMarginTop: '6rem',
                    marginBottom: '2.5rem',
                    paddingBottom: '2rem',
                    borderBottom: '1px solid var(--outline-variant)',
                  }}
                >
                  <div className="programs-subgroup-heading">
                    <h3
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        color: 'var(--color-on-surface)',
                        marginBottom: 0,
                      }}
                    >
                      {meta.label}
                    </h3>
                    <span className="programs-subgroup-count" style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>
                      {inGroup.length} program{inGroup.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', maxWidth: '42rem', marginBottom: '1.25rem', marginTop: '0.5rem' }}>
                    {meta.description}
                  </p>
                  <div className="programs-grid">
                    {inGroup.map((p) => (
                      <ProgramCard key={p.slug} program={p} />
                    ))}
                  </div>
                </section>
              );
            })}
            <style>{`

              .programs-starter-section {
                margin-bottom: 2rem;
                padding: 1rem;
                border: 1px solid var(--outline-variant);
                border-radius: var(--radius-xl);
                background: var(--surface-container-low);
              }
              .programs-starter-heading-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 1rem;
                flex-wrap: wrap;
              }
              .programs-see-all-link {
                display: inline-flex;
                margin-top: 1rem;
                color: var(--color-accent);
                font-weight: 800;
                text-decoration: underline;
                text-underline-offset: 4px;
              }
              .programs-quiz-sticky {
                display: none;
              }
              .programs-subgroup-heading {
                display: flex;
                align-items: baseline;
                gap: 0.5rem;
                flex-wrap: wrap;
                padding: 0 0 0.35rem;
              }
              /* Mobile (< 768px): enforce touch targets */
              @media (max-width: 767px) {
                .programs-starter-section { margin-left: -0.25rem; margin-right: -0.25rem; }
                .programs-quiz-sticky { display: flex; position: sticky; bottom: 0.75rem; z-index: 20; margin: 1.25rem 0 0; justify-content: center; }
                .programs-quiz-sticky a { box-shadow: 0 10px 30px rgba(0,0,0,0.22); width: min(100%, 24rem); justify-content: center; }
                .program-card .btn { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }
                .program-card-footer { flex-direction: column; align-items: stretch; }
                .program-card-footer > div { flex-direction: column; }
                .program-card-footer .btn { width: 100%; text-align: center; }
              }
            `}</style>
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
        <div className="programs-quiz-sticky"><LocalizedLink href="/find-your-path" className="btn btn-primary">Not sure? Take the 2-minute quiz</LocalizedLink></div>
        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '.85rem', color: 'var(--color-on-surface-variant)', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
          Bands are grounded in Lightcast/BLS-style data (Jan 2026). Your offer still depends on proof, role, and employer.
        </p>
        <div className="programs-bottom-actions">
          <LocalizedLink href="/find-your-path" className="btn btn-primary">Find Your Path — Take the Quiz</LocalizedLink>
          <LocalizedLink href="/program-comparison" className="btn btn-outline">Compare Programs</LocalizedLink>
          <LocalizedLink href="/salary-guide" className="btn btn-ghost">View Salary Guide</LocalizedLink>
        </div>
      </div>
    </section>
  );
}
