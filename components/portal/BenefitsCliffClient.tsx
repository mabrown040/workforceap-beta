'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ALL_CLIFF_SOURCES,
  BENEFITS_CLIFF_RULES_VERSION,
  computeCliff,
  type CliffProgramId,
  type CliffResult,
} from '@/lib/content/benefitsCliff';

const PROGRAM_OPTIONS: { id: CliffProgramId; labelKey: string }[] = [
  { id: 'snap', labelKey: 'programSnap' },
  { id: 'medicaidAdult', labelKey: 'programMedicaidAdult' },
  { id: 'medicaidChild', labelKey: 'programMedicaidChild' },
  { id: 'tanf', labelKey: 'programTanf' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 48,
  padding: '0.55rem 0.75rem',
  borderRadius: 10,
  border: '1px solid var(--surface-container-high)',
  background: 'var(--color-surface)',
  color: 'var(--color-on-surface)',
  fontSize: '0.9rem',
  fontWeight: 600,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.35rem',
  fontSize: '0.85rem',
  fontWeight: 700,
  color: 'var(--color-on-surface)',
};

function money(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}

export default function BenefitsCliffClient() {
  const t = useTranslations('benefitsCliff');

  const [householdSize, setHouseholdSize] = useState('3');
  const [receives, setReceives] = useState<CliffProgramId[]>(['snap']);
  const [currentEarnings, setCurrentEarnings] = useState('');
  const [currentSnap, setCurrentSnap] = useState('');
  const [offerWage, setOfferWage] = useState('');
  const [offerHours, setOfferHours] = useState('40');
  const [submitted, setSubmitted] = useState(false);

  const toggleProgram = (id: CliffProgramId) => {
    setSubmitted(false);
    setReceives((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const wage = parseFloat(offerWage);
  const hours = parseFloat(offerHours);
  const canCompute = Number.isFinite(wage) && wage > 0 && Number.isFinite(hours) && hours > 0 && receives.length > 0;

  const result: CliffResult | null = useMemo(() => {
    if (!submitted || !canCompute) return null;
    const snapAmount = parseFloat(currentSnap);
    return computeCliff({
      householdSize: parseInt(householdSize, 10) || 1,
      receives,
      currentMonthlyEarnings: parseFloat(currentEarnings) || 0,
      offerHourlyWage: wage,
      offerHoursPerWeek: hours,
      currentSnapMonthly: Number.isFinite(snapAmount) && snapAmount >= 0 ? snapAmount : undefined,
    });
  }, [submitted, canCompute, householdSize, receives, currentEarnings, currentSnap, wage, hours]);

  const verdictMeta =
    result &&
    {
      better_off: { icon: 'trending_up', color: '#2e7d32', bg: 'rgba(46,125,50,0.10)', title: t('verdictBetter') },
      worse_off: { icon: 'trending_down', color: 'var(--color-accent)', bg: 'rgba(173,44,77,0.10)', title: t('verdictWorse') },
      about_the_same: { icon: 'remove', color: 'var(--color-on-surface-variant)', bg: 'var(--surface-container-high)', title: t('verdictSame') },
    }[result.verdict];

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* ── Disclaimer — always visible, before any inputs ── */}
      <div
        className="portal-card portal-card--flat"
        role="note"
        style={{
          padding: '0.9rem 1.1rem',
          borderRadius: 14,
          background: 'rgba(173,44,77,0.06)',
          borderLeft: '4px solid var(--color-accent)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-on-surface)', display: 'flex', gap: '0.45rem', alignItems: 'flex-start' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.15rem', color: 'var(--color-accent)' }} aria-hidden>
            info
          </span>
          {t('disclaimerTitle')}
        </p>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)' }}>
          {t('disclaimerBody')}
        </p>
      </div>

      {/* ── Inputs ── */}
      <form
        className="portal-card portal-card--flat"
        style={{ padding: '1.1rem 1.25rem', borderRadius: 14, display: 'grid', gap: '0.9rem' }}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <div>
          <label htmlFor="bc-household" style={labelStyle}>
            {t('householdLabel')}
          </label>
          <select
            id="bc-household"
            value={householdSize}
            onChange={(e) => {
              setHouseholdSize(e.target.value);
              setSubmitted(false);
            }}
            style={inputStyle}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={String(n)}>
                {n === 8 ? t('householdEightPlus') : n}
              </option>
            ))}
          </select>
        </div>

        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend style={{ ...labelStyle, padding: 0 }}>{t('receivesLabel')}</legend>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {PROGRAM_OPTIONS.map((p) => (
              <label
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  minHeight: 44,
                  padding: '0.35rem 0.6rem',
                  borderRadius: 10,
                  border: '1px solid var(--surface-container-high)',
                  background: receives.includes(p.id) ? 'var(--surface-container-low)' : 'var(--color-surface)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--color-on-surface)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={receives.includes(p.id)}
                  onChange={() => toggleProgram(p.id)}
                  style={{ width: 20, height: 20 }}
                />
                {t(p.labelKey)}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="bc-current-earnings" style={labelStyle}>
            {t('currentEarningsLabel')}
          </label>
          <input
            id="bc-current-earnings"
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            placeholder="0"
            value={currentEarnings}
            onChange={(e) => {
              setCurrentEarnings(e.target.value);
              setSubmitted(false);
            }}
            style={inputStyle}
          />
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
            {t('currentEarningsHint')}
          </p>
        </div>

        {receives.includes('snap') && (
          <div>
            <label htmlFor="bc-current-snap" style={labelStyle}>
              {t('currentSnapLabel')}
            </label>
            <input
              id="bc-current-snap"
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              placeholder={t('optionalPlaceholder')}
              value={currentSnap}
              onChange={(e) => {
                setCurrentSnap(e.target.value);
                setSubmitted(false);
              }}
              style={inputStyle}
            />
          </div>
        )}

        <div style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <div>
            <label htmlFor="bc-wage" style={labelStyle}>
              {t('offerWageLabel')}
            </label>
            <input
              id="bc-wage"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.25"
              placeholder="15.00"
              value={offerWage}
              onChange={(e) => {
                setOfferWage(e.target.value);
                setSubmitted(false);
              }}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label htmlFor="bc-hours" style={labelStyle}>
              {t('offerHoursLabel')}
            </label>
            <input
              id="bc-hours"
              type="number"
              inputMode="decimal"
              min={1}
              max={80}
              step="1"
              value={offerHours}
              onChange={(e) => {
                setOfferHours(e.target.value);
                setSubmitted(false);
              }}
              style={inputStyle}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!canCompute}
          style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden>
            account_balance
          </span>
          {t('computeCta')}
        </button>
        {receives.length === 0 && (
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-accent)' }}>{t('pickOneProgram')}</p>
        )}
      </form>

      {/* ── Result ── */}
      {result && verdictMeta && (
        <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', borderRadius: 16 }} aria-live="polite">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.85rem 1rem',
              borderRadius: 12,
              background: verdictMeta.bg,
              marginBottom: '0.9rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.6rem', color: verdictMeta.color }} aria-hidden>
              {verdictMeta.icon}
            </span>
            <div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>{verdictMeta.title}</p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', fontWeight: 700, color: verdictMeta.color }}>
                {t('netChangeLine', { amount: money(result.netChangeMonthly) })}
              </p>
            </div>
          </div>

          {/* Plain-language explanation (deterministic, no AI) */}
          <p style={{ margin: '0 0 0.9rem', fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)' }}>
            {t('explainLine', {
              earnings: money(result.earningsChangeMonthly),
              benefits: money(result.benefitsChangeMonthly),
            })}
          </p>

          {/* Per-program breakdown */}
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
            {result.programs.map((p) => {
              const label = t(PROGRAM_OPTIONS.find((o) => o.id === p.programId)!.labelKey);
              return (
                <li
                  key={p.programId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 0.8rem',
                    borderRadius: 10,
                    border: '1px solid var(--surface-container-high)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{label}</p>
                    {p.losesEligibility && (
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }} aria-hidden>
                          warning
                        </span>
                        {p.kind === 'coverage' ? t('mayLoseCoverage') : t('mayLoseBenefit')}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, whiteSpace: 'nowrap', color: p.kind === 'coverage' ? 'var(--color-on-surface-variant)' : p.changeMonthly < 0 ? 'var(--color-accent)' : '#2e7d32' }}>
                    {p.kind === 'coverage'
                      ? p.losesEligibility
                        ? t('coverageAtRisk')
                        : t('coverageKept')
                      : t('perMonth', { amount: money(p.changeMonthly) })}
                  </span>
                </li>
              );
            })}
          </ul>

          {result.losesHealthCoverage && (
            <p style={{ margin: '0.9rem 0 0', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)' }}>
              {t('coverageNote')}
            </p>
          )}

          {/* Counselor follow-up CTA */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Link
              href="/dashboard/messages"
              className="btn btn-primary"
              style={{ minHeight: 48, flex: '1 1 220px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden>
                support_agent
              </span>
              {t('counselorCta')}
            </Link>
          </div>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)' }}>
            {t('counselorNote')}
          </p>
        </div>
      )}

      {/* ── Sources ── */}
      <details className="portal-card portal-card--flat" style={{ padding: '0.9rem 1.1rem', borderRadius: 14 }}>
        <summary style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-on-surface)', cursor: 'pointer' }}>
          {t('sourcesTitle', { version: BENEFITS_CLIFF_RULES_VERSION })}
        </summary>
        <ul style={{ margin: '0.6rem 0 0', paddingLeft: '1.1rem', display: 'grid', gap: '0.35rem' }}>
          {ALL_CLIFF_SOURCES.map((s) => (
            <li key={s.url + s.program} style={{ fontSize: '0.78rem', lineHeight: 1.45, color: 'var(--color-on-surface-variant)' }}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                {s.program}
              </a>{' '}
              — {s.publisher}, {s.year}. {t('lastVerified', { date: s.lastVerified })}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
