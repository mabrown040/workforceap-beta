'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getProgramDisplayTitle, type Program, type LanguageSupport, type LanguageSupportLevel } from '@/lib/content/programs';
import ProgramOnetCareerSection from '@/components/programs/ProgramOnetCareerSection';

function LanguageSection({ languages }: { languages?: LanguageSupport }) {
  const tPrograms = useTranslations('marketing.programs');
  const tCommon = useTranslations('common');

  if (!languages) {
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{tPrograms('languagesTitle')}</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>{tPrograms('languageEnglishOnly')}</p>
      </div>
    );
  }

  const entries: { code: keyof LanguageSupport; level: LanguageSupportLevel; label: string }[] = [
    { code: 'es', level: languages.es, label: tCommon('languageEs') },
    { code: 'pt', level: languages.pt, label: tCommon('languagePt') },
    { code: 'fr', level: languages.fr, label: tCommon('languageFr') },
  ];

  const active = entries.filter((e) => e.level !== 'none');

  if (active.length === 0) {
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{tPrograms('languagesTitle')}</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>{tPrograms('languageEnglishOnly')}</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{tPrograms('languagesTitle')}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span
          style={{
            background: 'var(--surface-container)',
            color: 'var(--color-on-surface)',
            padding: '0.25rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.9rem',
          }}
        >
          {tCommon('languageEn')}
        </span>
        {active.map((e) => {
          let text: string;
          if (e.level === 'full') text = tPrograms('languageFull', { language: e.label });
          else if (e.level === 'subtitles') text = tPrograms('languageSubtitles', { language: e.label });
          else text = tPrograms('languageAuto', { language: e.label });
          return (
            <span
              key={e.code}
              style={{
                background: 'var(--surface-container)',
                color: 'var(--color-on-surface)',
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}
            >
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function ProgramDetailClient({ program }: { program: Program }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const skills = program.skills.filter((s) => s.trim().length > 0);
  const displayTitle = getProgramDisplayTitle(program);

  return (
    <div>
      <ProgramOnetCareerSection programSlug={program.slug} />

      <LanguageSection languages={program.languagesSupported} />

      {skills.length > 0 ? (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Skills you&rsquo;ll learn</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {skills.map((s) => (
              <span
                key={s}
                className="program-skill-tag"
                style={{
                  background: 'var(--surface-container)',
                  color: 'var(--color-on-surface)',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Course list</h2>
      <div style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {program.courses.map((c, i) => {
          const isOpen = openIndex === i;
          const panelId = `program-course-panel-${c.slug}`;

          return (
            <div
              key={c.slug}
              style={{ borderBottom: i < program.courses.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  font: 'inherit',
                }}
              >
                <span>
                  <span style={{ marginRight: '0.5rem' }}>{i + 1}.</span>
                  {c.name}
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginLeft: '0.5rem' }}>
                    ~{c.estimatedHours} hrs
                  </span>
                </span>
                <span aria-hidden="true" style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', flexShrink: 0 }}>
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              <div
                id={panelId}
                hidden={!isOpen}
                role="region"
                aria-label={`${c.name} details`}
                style={{ padding: '0 1rem 1rem 1rem', paddingLeft: '2rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}
              >
                Part of the {displayTitle} program.
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
