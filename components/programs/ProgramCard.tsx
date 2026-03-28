'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Program } from '@/lib/content/programs';

interface ProgramCardProps {
  program: Program;
  featured?: boolean;
}

function getAudience(category: string): string {
  switch (category) {
    case 'ai-software':
      return 'Career switchers and junior developers ready to build production software with AI tools.';
    case 'cloud-data':
      return 'Analytical learners who want cloud, BI, and data roles with strong upward mobility.';
    case 'it-cyber':
      return 'Problem-solvers aiming for help desk, SOC analyst, and infrastructure support tracks.';
    case 'business':
      return 'Operators and communicators who want to lead projects, growth, and customer outcomes.';
    case 'healthcare':
      return 'Mission-driven learners seeking stable healthcare admin and health information careers.';
    case 'manufacturing':
      return 'Hands-on builders pursuing skilled technical work in production, logistics, and trades.';
    default:
      return 'Beginners and returning learners building confidence, digital fluency, and job readiness.';
  }
}

function getPlacementStat(category: string): string | null {
  if (category === 'digital-literacy') return null;
  if (category === 'manufacturing') return 'Placement support with regional employers and apprenticeship pathways.';
  return 'Career coaching + employer partner network with strong placement momentum after completion.';
}

export default function ProgramCard({ program, featured = false }: ProgramCardProps) {
  const [expanded, setExpanded] = useState(false);

  const keySkills = useMemo(() => program.skills.slice(0, 5), [program.skills]);
  const curriculumPreview = useMemo(() => program.courses.slice(0, 6), [program.courses]);
  const certNames = useMemo(() => {
    const certBase = program.title
      .replace('Professional Certificate', 'Certificate')
      .replace('Developer Certificate', 'Certificate')
      .trim();
    return [certBase, `${program.partner} Career Credential`];
  }, [program.title, program.partner]);

  return (
    <article
      className="wa-relative wa-border wa-rounded-none wa-p-5 md:wa-p-6 wa-transition-all wa-duration-200 hover:wa-border-[#ad2c4d] hover:wa-shadow-[0_0_0_1px_rgba(173,44,77,0.3)]"
      style={{ background: '#1c1b1b', borderColor: 'rgba(88,65,68,0.5)' }}
    >
      {featured && (
        <div className="wa-absolute wa-top-3 wa-right-3 wa-text-[11px] wa-font-bold wa-uppercase wa-px-2 wa-py-1" style={{ color: '#ffb2bc', border: '1px solid rgba(173,44,77,0.5)' }}>
          ⭐ Featured
        </div>
      )}

      <div className="wa-flex wa-items-start wa-justify-between wa-gap-3 wa-pr-20">
        <div>
          <h3 className="wa-text-xl md:wa-text-2xl wa-font-bold wa-leading-tight" style={{ color: '#e6e1e1' }}>
            {program.title}
          </h3>
          <div className="wa-mt-3 wa-flex wa-flex-wrap wa-items-center wa-gap-2">
            <span className="wa-text-[11px] wa-uppercase wa-font-bold wa-px-2 wa-py-1" style={{ color: '#debfc2', border: '1px solid rgba(222,191,194,0.35)' }}>
              {program.categoryLabel}
            </span>
            <span className="wa-text-sm" style={{ color: '#debfc2' }}>{program.duration}</span>
          </div>
        </div>
      </div>

      <div className="wa-mt-4 wa-flex wa-flex-wrap wa-gap-2">
        <span className="wa-text-xs wa-font-bold wa-px-2 wa-py-1" style={{ color: '#e6e1e1', border: '1px solid rgba(173,44,77,0.5)', background: 'rgba(173,44,77,0.14)' }}>{program.partner}</span>
        <span className="wa-text-xs wa-font-bold wa-px-2 wa-py-1" style={{ color: '#e6e1e1', border: '1px solid rgba(173,44,77,0.35)' }}>Certificate Ready</span>
      </div>

      <p className="wa-mt-4 wa-text-sm wa-leading-relaxed" style={{ color: '#debfc2' }}>
        {program.partner}-aligned pathway focused on practical skills, project work, and exam readiness to help you move into entry-level roles quickly.
      </p>

      <ul className="wa-mt-4 wa-space-y-2">
        {keySkills.map((skill) => (
          <li key={skill} className="wa-text-sm wa-flex wa-items-start wa-gap-2" style={{ color: '#e6e1e1' }}>
            <span style={{ color: '#ad2c4d' }}>•</span>
            <span>{skill}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="wa-mt-5 wa-w-full wa-flex wa-items-center wa-justify-between wa-text-left wa-py-2 wa-bg-transparent wa-border-0 wa-cursor-pointer"
        style={{ color: '#ffb2bc' }}
      >
        <span className="wa-text-xs wa-font-bold wa-uppercase" style={{ letterSpacing: '0.12em' }}>
          {expanded ? 'Hide details' : 'Expand details'}
        </span>
        <span className={`wa-inline-block wa-transition-transform wa-duration-300 ${expanded ? 'wa-rotate-180' : ''}`}>⌄</span>
      </button>

      <div
        className={`wa-grid wa-transition-all wa-duration-300 ${expanded ? 'wa-grid-rows-[1fr] wa-opacity-100 wa-mt-2' : 'wa-grid-rows-[0fr] wa-opacity-0 wa-mt-0'}`}
      >
        <div className="wa-overflow-hidden">
          <div className="wa-pt-3 wa-border-t wa-space-y-4" style={{ borderColor: 'rgba(88,65,68,0.5)' }}>
            <div>
              <h4 className="wa-text-xs wa-font-bold wa-uppercase wa-mb-2" style={{ color: '#ffb2bc', letterSpacing: '0.12em' }}>
                Curriculum Overview
              </h4>
              <ul className="wa-space-y-1">
                {curriculumPreview.map((course) => (
                  <li key={course.slug} className="wa-text-sm" style={{ color: '#debfc2' }}>
                    {course.name}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="wa-text-xs wa-font-bold wa-uppercase wa-mb-1" style={{ color: '#ffb2bc', letterSpacing: '0.12em' }}>
                Who It&apos;s For
              </h4>
              <p className="wa-text-sm" style={{ color: '#debfc2' }}>{getAudience(program.category)}</p>
            </div>

            {getPlacementStat(program.category) && (
              <div>
                <h4 className="wa-text-xs wa-font-bold wa-uppercase wa-mb-1" style={{ color: '#ffb2bc', letterSpacing: '0.12em' }}>
                  Placement
                </h4>
                <p className="wa-text-sm" style={{ color: '#debfc2' }}>{getPlacementStat(program.category)}</p>
              </div>
            )}

            <div>
              <h4 className="wa-text-xs wa-font-bold wa-uppercase wa-mb-2" style={{ color: '#ffb2bc', letterSpacing: '0.12em' }}>
                Certifications
              </h4>
              <div className="wa-flex wa-flex-wrap wa-gap-2">
                {certNames.map((name) => (
                  <span key={name} className="wa-text-xs wa-px-2 wa-py-1" style={{ color: '#e6e1e1', border: '1px solid rgba(222,191,194,0.35)' }}>
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <Link
              href={`/apply?program=${program.slug}`}
              className="wa-inline-flex wa-items-center wa-justify-center wa-w-full wa-font-bold wa-text-sm wa-px-4 wa-py-3 wa-no-underline"
              style={{ background: '#ad2c4d', color: '#fff' }}
            >
              Apply Free
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
