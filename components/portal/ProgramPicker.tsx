'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Program } from '@/lib/content/programs';
import { ProgramIcon } from '@/components/ProgramIcon';

type WioaErrorCode = 'WIOA_NOT_STARTED' | 'WIOA_PENDING' | 'WIOA_NOT_ELIGIBLE';

type EnrollError =
  | { type: 'wioa'; code: WioaErrorCode; message: string }
  | { type: 'generic'; message: string };

type ProgramPickerProps = {
  programs: Program[];
  /** When available cheaply from the parent page, shown on the WIOA_PENDING notice. Optional — no extra fetch is done here. */
  wioaScreeningSubmittedAt?: Date | string | null;
};

function formatSubmittedDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function WioaErrorMessage({
  error,
  wioaScreeningSubmittedAt,
}: {
  error: EnrollError;
  wioaScreeningSubmittedAt?: Date | string | null;
}) {
  if (error.type === 'generic') {
    return (
      <p role="alert" style={{ marginTop: '0.75rem', color: 'var(--color-accent)', fontSize: '0.875rem' }}>
        {error.message}
      </p>
    );
  }

  const isBlocked = error.code === 'WIOA_NOT_ELIGIBLE';
  const bg = isBlocked ? 'rgba(173,44,77,0.08)' : 'rgba(43,123,185,0.08)';
  const border = isBlocked ? '1px solid rgba(173,44,77,0.25)' : '1px solid rgba(43,123,185,0.25)';
  const color = isBlocked ? '#ad2c4d' : '#2b7bb9';
  const submittedLabel = wioaScreeningSubmittedAt ? formatSubmittedDate(wioaScreeningSubmittedAt) : '';

  return (
    <div
      role="alert"
      style={{
        marginTop: '0.75rem',
        padding: '0.875rem 1rem',
        background: bg,
        border,
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        color: 'var(--color-on-surface)',
        lineHeight: 1.55,
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color, marginBottom: error.code === 'WIOA_NOT_STARTED' || error.code === 'WIOA_NOT_ELIGIBLE' || error.code === 'WIOA_PENDING' ? '0.5rem' : 0 }}>
        {error.message}
      </p>
      {error.code === 'WIOA_PENDING' && (
        <>
          <p style={{ margin: '0 0 0.5rem' }}>
            {submittedLabel ? `Submitted ${submittedLabel} — r` : 'R'}eview is typically completed within a few business
            days. You don&apos;t need to do anything else while it&apos;s in progress.
          </p>
          <Link
            href="/dashboard/messages"
            style={{ color: '#2b7bb9', fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}
          >
            Message your counselor →
          </Link>
        </>
      )}
      {error.code === 'WIOA_NOT_STARTED' && (
        <Link
          href="/dashboard/learning/wioa-qualification"
          style={{ color: '#2b7bb9', fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}
        >
          Start WIOA screening →
        </Link>
      )}
      {error.code === 'WIOA_NOT_ELIGIBLE' && (
        <Link
          href="/contact"
          style={{ color: '#ad2c4d', fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}
        >
          Contact WorkforceAP →
        </Link>
      )}
    </div>
  );
}

export default function ProgramPicker({ programs, wioaScreeningSubmittedAt }: ProgramPickerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<EnrollError | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const selectedProgram = useMemo(
    () => programs.find((program) => program.slug === selectedSlug) ?? null,
    [programs, selectedSlug]
  );

  const handleConfirm = async () => {
    if (!selectedProgram) return;
    setEnrollError(null);
    setLoading(selectedProgram.slug);
    try {
      const res = await fetch('/api/member/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programSlug: selectedProgram.slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        const wioaCodes: WioaErrorCode[] = ['WIOA_NOT_STARTED', 'WIOA_PENDING', 'WIOA_NOT_ELIGIBLE'];
        if (wioaCodes.includes(data.code)) {
          setEnrollError({ type: 'wioa', code: data.code as WioaErrorCode, message: data.error ?? '' });
        } else {
          setEnrollError({ type: 'generic', message: data.error ?? 'Failed to enroll' });
        }
        setLoading(null);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setEnrollError({ type: 'generic', message: 'Failed to enroll. Please try again.' });
      setLoading(null);
    }
  };

  return (
    <div>
      {selectedProgram && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--outline-variant)' }}>
          <p style={{ marginBottom: '0.35rem', fontWeight: 700 }}>Review your selection</p>
          <p style={{ marginBottom: '0.35rem' }}>
            <strong>{selectedProgram.title}</strong> · {selectedProgram.duration} · {selectedProgram.salary}
          </p>
          <p style={{ marginBottom: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
            Funding is tied to one program. After you confirm, changes require WorkforceAP admin help.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={!!loading}
              aria-busy={loading === selectedProgram.slug}
              style={{ minHeight: '48px' }}
            >
              <span aria-live="polite">
                {loading === selectedProgram.slug ? 'Confirming…' : 'Confirm program'}
              </span>
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => { setSelectedSlug(null); setEnrollError(null); }}
              disabled={!!loading}
              style={{ minHeight: '48px' }}
            >
              Keep comparing
            </button>
          </div>

          {enrollError && (
            <WioaErrorMessage error={enrollError} wioaScreeningSubmittedAt={wioaScreeningSubmittedAt} />
          )}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {programs.map((p) => {
          const isSelected = selectedSlug === p.slug;
          return (
            <div
              key={p.slug}
              style={{
                padding: '1.25rem',
                border: isSelected ? `2px solid ${p.borderColor}` : '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-md)',
                borderTop: `3px solid ${p.borderColor}`,
                background: 'white',
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
              <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
                <div>⏱ {p.duration}</div>
                <div style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{p.salary}</div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.6rem' }}
                onClick={() => setSelectedSlug(p.slug)}
                disabled={!!loading}
                aria-busy={loading === p.slug}
              >
                <span aria-live="polite">
                  {isSelected ? 'Ready to confirm above' : 'Review selection'}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
