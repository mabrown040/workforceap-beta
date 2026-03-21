'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import { APPLY_STORAGE_KEY } from '../ApplyEligibilityClient';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ProgramIcon } from '@/components/ProgramIcon';

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

  const handleContinue = () => {
    if (!selectedSlug) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(PROGRAM_STORAGE_KEY, selectedSlug);
    }
    window.location.href = '/apply/create-account';
  };

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
              <p style={{ margin: 0 }}>We&rsquo;d still love to connect. Choose a program below — we&rsquo;ll review your application and help identify the best path for you, including other resources if our current funding doesn&rsquo;t fit.</p>
            </div>
            <h2 className="apply-step-title">Which program interests you most?</h2>
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
          {PROGRAMS.map((p) => (
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
