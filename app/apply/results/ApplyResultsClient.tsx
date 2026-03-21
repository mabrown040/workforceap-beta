'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import { APPLY_STORAGE_KEY } from '../ApplyEligibilityClient';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ProgramIcon } from '@/components/ProgramIcon';
import { trackApplyFunnel } from '@/lib/analytics/events';

const PROGRAM_STORAGE_KEY = 'apply_program_slug';

export default function ApplyResultsClient() {
  const searchParams = useSearchParams();
  const programParam = searchParams.get('program');
  const [qualifies, setQualifies] = useState<boolean | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>(programParam ?? '');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (programParam && getProgramBySlug(programParam)) {
      setSelectedSlug(programParam);
      setQualifies(true);
      return;
    }
    try {
      const stored = sessionStorage.getItem(APPLY_STORAGE_KEY);
      if (!stored) {
        window.location.href = '/apply';
        return;
      }
      const data = JSON.parse(stored);
      setQualifies(data.qualifies === true);
    } catch {
      window.location.href = '/apply';
    }
  }, [programParam]);

  useEffect(() => {
    if (qualifies === null) return;
    trackApplyFunnel(2, 'results_view', { qualifies });
  }, [qualifies]);

  const handleContinue = () => {
    if (!selectedSlug) return;
    trackApplyFunnel(2, 'program_selected', { program_slug: selectedSlug });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(PROGRAM_STORAGE_KEY, selectedSlug);
    }
    window.location.href = '/apply/create-account';
  };

  const programsOrdered =
    qualifies === null
      ? PROGRAMS
      : qualifies
        ? PROGRAMS
        : [...PROGRAMS].sort((a, b) => {
            const dig = 'digital-literacy-empowerment-class';
            if (a.slug === dig) return -1;
            if (b.slug === dig) return 1;
            return 0;
          });

  if (qualifies === null) {
    return (
      <div className="apply-flow">
        <div className="apply-progress-bar">
          <div className="skeleton" style={{ height: 6, borderRadius: 3, width: '66%' }} />
        </div>
        <div className="apply-step-content" style={{ marginTop: '1.5rem' }}>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="apply-flow">
      <div className="apply-progress-bar">
        <div className="apply-progress-fill" style={{ width: '66%' }} />
        <p className="apply-progress-label">Step 2 of 3</p>
      </div>

      <div className="apply-step-content">
        {qualifies ? (
          <>
            <div className={`funding-banner funding-banner-qualify`} style={{ marginBottom: '1.5rem' }}>
              <p><strong>Looks like a good fit.</strong> We&rsquo;ll connect within 24–48 hours to walk through next steps. First, pick the program that interests you most:</p>
            </div>
            <h2 className="apply-step-title">Choose the program you&apos;re most interested in:</h2>
          </>
        ) : (
          <>
            <div className="apply-results-anyway" style={{ marginBottom: '1rem', padding: '1rem 1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <p style={{ margin: 0 }}>
                <strong>Your answers don&apos;t match our standard funding profile right now.</strong> That is not a
                &quot;no&quot; to you — it means we may need a different path or timing. We still review every application
                and help people move toward job-ready skills.
              </p>
            </div>
            <section className="apply-foundational-support" aria-labelledby="apply-foundational-heading">
              <h2 id="apply-foundational-heading" className="apply-foundational-support__title">
                Start with support, not a dead end
              </h2>
              <ul className="apply-foundational-support__list">
                <li>
                  <strong>Digital foundations:</strong> Uncomfortable with computers or online forms? Our{' '}
                  <Link href="/programs/digital-literacy-empowerment-class">Digital Literacy Empowerment Class</Link> is
                  listed first below — it builds confidence before heavier tech tracks.
                </li>
                <li>
                  <strong>Not sure what fits?</strong> Take the{' '}
                  <Link href="/find-your-path">2-minute pathfinder</Link> for ranked program ideas.
                </li>
                <li>
                  <strong>Want to talk to a person?</strong>{' '}
                  <Link href="/contact">Contact us</Link> or call{' '}
                  <a href="tel:+15127771808">(512) 777-1808</a> — we respond within 24–48 hours.
                </li>
              </ul>
            </section>
            <h2 className="apply-step-title">Which program interests you most?</h2>
            <p className="apply-results-program-hint">
              Pick one to continue — a counselor will review your situation and next steps with you.
            </p>
          </>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {programsOrdered.map((p) => (
            <div
              key={p.slug}
              onClick={() => setSelectedSlug(p.slug)}
              style={{
                padding: '1.25rem',
                border: selectedSlug === p.slug ? '2px solid var(--color-accent)' : '1px solid #e5e5e5',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                background: selectedSlug === p.slug ? 'rgba(74, 155, 79, 0.05)' : 'white',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span
                  style={{
                    background: p.categoryColor,
                    color: 'white',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {p.categoryLabel}
                </span>
                <span style={{ display: 'flex', alignItems: 'center' }}><ProgramIcon program={p} size={24} /></span>
              </div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{p.title}</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>
                <div>⏱ {p.duration}</div>
                <div style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{p.salary}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={!selectedSlug}
          onClick={handleContinue}
        >
          Continue to Create Your Account →
        </button>
      </div>
    </div>
  );
}
