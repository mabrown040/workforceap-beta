'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { normalizePrimaryBarriers, PRIMARY_BARRIER_OPTIONS } from '@/lib/apply/primaryBarrierOptions';

// Mirror the apply flow's option lists so member-supplied data stays
// consistent with the public application (app/apply/ApplyEligibilityClient.tsx).
const AGE_GROUPS = [
  { value: '18_24', label: '18–24' },
  { value: '25_50', label: '25–50' },
  { value: '50_plus', label: '50+' },
] as const;

type AgeGroupValue = (typeof AGE_GROUPS)[number]['value'] | '';

export type EligibilityInitial = {
  ageGroup: AgeGroupValue;
  city: string;
  state: string;
  zip: string;
  county: string;
  primaryBarriers: string[];
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 700,
  color: 'var(--color-on-surface)',
  marginBottom: '0.375rem',
} as const;

const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: 'var(--radius-md, 8px)',
  border: '1px solid var(--outline-variant, rgba(0,0,0,0.18))',
  background: 'var(--surface-container-lowest)',
  color: 'var(--color-on-surface)',
  fontSize: '0.9375rem',
} as const;

export default function EligibilityForm({ initial }: { initial: EligibilityInitial }) {
  const [ageGroup, setAgeGroup] = useState<AgeGroupValue>(initial.ageGroup);
  const [city, setCity] = useState(initial.city);
  const [state, setState] = useState(initial.state);
  const [zip, setZip] = useState(initial.zip);
  const [county, setCounty] = useState(initial.county);
  const [barriers, setBarriers] = useState<string[]>(
    normalizePrimaryBarriers(initial.primaryBarriers),
  );
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hoveredBarrier, setHoveredBarrier] = useState<string | null>(null);
  const feedbackRef = useRef<HTMLSpanElement>(null);

  // Move focus to the save result so keyboard/screen reader users get
  // immediate confirmation instead of having to scan the page for it.
  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  const toggleBarrier = (value: string) => {
    setBarriers((prev) =>
      normalizePrimaryBarriers(
        prev.includes(value) ? prev.filter((b) => b !== value) : [...prev, value]
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/member/eligibility', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ageGroup: ageGroup || null,
            city: city.trim() || null,
            state: state.trim() || null,
            zip: zip.trim() || null,
            county: county.trim() || null,
            primaryBarriers: barriers,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? 'Could not save your info right now.');
        }
        setFeedback({ ok: true, message: 'Your eligibility info has been saved. Thank you!' });
      } catch (err) {
        setFeedback({
          ok: false,
          message: err instanceof Error ? err.message : 'Could not save your info right now.',
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <label htmlFor="elig-age" style={labelStyle}>
          Age group
        </label>
        <select
          id="elig-age"
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value as AgeGroupValue)}
          style={inputStyle}
        >
          <option value="">Select an age group</option>
          {AGE_GROUPS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))' }}>
        <div>
          <label htmlFor="elig-city" style={labelStyle}>
            City
          </label>
          <input id="elig-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} autoComplete="address-level2" />
        </div>
        <div>
          <label htmlFor="elig-state" style={labelStyle}>
            State
          </label>
          <input id="elig-state" type="text" value={state} onChange={(e) => setState(e.target.value)} style={inputStyle} autoComplete="address-level1" />
        </div>
        <div>
          <label htmlFor="elig-zip" style={labelStyle}>
            ZIP
          </label>
          <input id="elig-zip" type="text" value={zip} onChange={(e) => setZip(e.target.value)} style={inputStyle} inputMode="numeric" autoComplete="postal-code" />
        </div>
        <div>
          <label htmlFor="elig-county" style={labelStyle}>
            County
          </label>
          <input id="elig-county" type="text" value={county} onChange={(e) => setCounty(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend style={{ ...labelStyle, marginBottom: '0.625rem' }}>Primary barriers (select all that apply)</legend>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {PRIMARY_BARRIER_OPTIONS.map((opt) => {
            const checked = barriers.includes(opt.value);
            const hovered = hoveredBarrier === opt.value;
            return (
              <label
                key={opt.value}
                onMouseEnter={() => setHoveredBarrier(opt.value)}
                onMouseLeave={() => setHoveredBarrier((v) => (v === opt.value ? null : v))}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  minHeight: '44px',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: checked
                    ? '1px solid var(--color-accent)'
                    : '1px solid var(--outline-variant, rgba(0,0,0,0.18))',
                  background: checked
                    ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)'
                    : hovered
                      ? 'var(--surface-container-low)'
                      : 'var(--surface-container-lowest)',
                  fontSize: '0.875rem',
                  color: 'var(--color-on-surface)',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleBarrier(opt.value)}
                  style={{ marginTop: '0.2rem', flexShrink: 0, accentColor: 'var(--color-accent)' }}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          type="submit"
          disabled={isPending}
          className="btn"
          style={{
            fontWeight: 600,
            padding: '0.6rem 1.1rem',
            minHeight: '44px',
            borderRadius: '0.45rem',
            border: '1px solid var(--color-accent, #ad2c4d)',
            background: 'var(--color-accent, #ad2c4d)',
            color: 'var(--color-on-accent, #fff)',
            cursor: isPending ? 'wait' : 'pointer',
          }}
        >
          {isPending ? 'Saving…' : 'Save eligibility info'}
        </button>
        {feedback ? (
          <span
            ref={feedbackRef}
            role={feedback.ok ? 'status' : 'alert'}
            tabIndex={-1}
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: feedback.ok ? 'var(--color-green, #15803d)' : 'var(--color-accent)',
            }}
          >
            {feedback.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
