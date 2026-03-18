'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ASSESSMENT_QUESTIONS } from '@/lib/assessment/answer-key';
import { formatPhone } from '@/lib/formatPhone';

type AssessmentUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  programInterest: string | null;
  assessmentScore: number | null;
  assessmentScorePct: number | null;
  assessmentCompletedAt: Date | null;
  assessmentAnswers: unknown;
};

type AssessmentsTableProps = {
  users: AssessmentUser[];
  highlightUserId?: string;
  programFilter?: string;
  minScore?: number;
  maxScore?: number;
};

export default function AssessmentsTable({
  users,
  highlightUserId,
  programFilter,
  minScore,
  maxScore,
}: AssessmentsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(highlightUserId ?? null);
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...users].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'date') {
      const da = a.assessmentCompletedAt?.getTime() ?? 0;
      const db = b.assessmentCompletedAt?.getTime() ?? 0;
      cmp = da - db;
    } else if (sortBy === 'score') {
      cmp = (a.assessmentScorePct ?? 0) - (b.assessmentScorePct ?? 0);
    } else {
      cmp = (a.fullName ?? '').localeCompare(b.fullName ?? '');
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.push(`/admin/assessments?${params.toString()}`);
  };

  const exportCsv = () => {
    const headers = ['Name', 'Email', 'Phone', 'Program Interest', 'Score %', 'Date Completed'];
    const rows = sorted.map((u) => [
      u.fullName,
      u.email,
      u.phone ?? '',
      u.programInterest ?? '',
      String(u.assessmentScorePct ?? ''),
      u.assessmentCompletedAt?.toISOString() ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const answers = (u: AssessmentUser): Record<number, string> => {
    const a = u.assessmentAnswers;
    if (!a || typeof a !== 'object') return {};
    return a as Record<number, string>;
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const program = (form.querySelector('#program-filter') as HTMLInputElement)?.value?.trim();
          const min = (form.querySelector('#min-score') as HTMLInputElement)?.value;
          const max = (form.querySelector('#max-score') as HTMLInputElement)?.value;
          updateFilters({ program: program || undefined, minScore: min || undefined, maxScore: max || undefined });
        }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label htmlFor="program-filter" style={{ fontSize: '0.9rem' }}>Program:</label>
          <input
            id="program-filter"
            type="text"
            placeholder="Filter by program"
            defaultValue={programFilter ?? ''}
            style={{ padding: '0.4rem 0.6rem', width: '200px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label htmlFor="min-score" style={{ fontSize: '0.9rem' }}>Score %:</label>
          <input
            id="min-score"
            type="number"
            min={0}
            max={100}
            placeholder="Min"
            defaultValue={minScore ?? ''}
            style={{ padding: '0.4rem 0.6rem', width: '70px' }}
          />
          <span>–</span>
          <input
            id="max-score"
            type="number"
            min={0}
            max={100}
            placeholder="Max"
            defaultValue={maxScore ?? ''}
            style={{ padding: '0.4rem 0.6rem', width: '70px' }}
          />
        </div>
        <button type="submit" className="btn btn-outline">
          Apply filters
        </button>
        <button type="button" className="btn btn-outline" onClick={exportCsv}>
          Export CSV
        </button>
      </form>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', cursor: 'pointer' }} onClick={() => { setSortBy('name'); setSortDir(sortBy === 'name' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
                Name {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Program Interest</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', cursor: 'pointer' }} onClick={() => { setSortBy('score'); setSortDir(sortBy === 'score' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
                Score % {sortBy === 'score' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ textAlign: 'left', padding: '0.5rem', cursor: 'pointer' }} onClick={() => { setSortBy('date'); setSortDir(sortBy === 'date' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
                Date Completed {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.flatMap((u) => [
              <tr
                key={u.id}
                onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                style={{
                  cursor: 'pointer',
                  background: highlightUserId === u.id ? 'rgba(74, 155, 79, 0.1)' : expandedId === u.id ? 'var(--color-light)' : undefined,
                }}
              >
                <td style={{ padding: '0.5rem' }}>{u.fullName}</td>
                <td style={{ padding: '0.5rem' }}>{u.email}</td>
                <td style={{ padding: '0.5rem' }}>{formatPhone(u.phone)}</td>
                <td style={{ padding: '0.5rem' }}>{u.programInterest ?? '—'}</td>
                <td style={{ padding: '0.5rem' }}>{u.assessmentScorePct ?? '—'}%</td>
                <td style={{ padding: '0.5rem' }}>{u.assessmentCompletedAt?.toLocaleDateString() ?? '—'}</td>
              </tr>,
              ...(expandedId === u.id
                ? [
                    <tr key={`${u.id}-exp`}>
                      <td colSpan={6} style={{ padding: '1rem', background: 'var(--color-light)', borderBottom: '1px solid #ddd' }}>
                        <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Answer breakdown</h4>
                        <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                          {ASSESSMENT_QUESTIONS.map((q) => {
                            const ans = answers(u)[q.id];
                            const correct = ans === q.correct;
                            return (
                              <div key={q.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                                <span style={{ fontWeight: 600, minWidth: '2rem' }}>Q{q.id}:</span>
                                <span>{q.question}</span>
                                <span style={{ color: correct ? 'var(--color-success, green)' : 'var(--color-error, red)' }}>
                                  {ans ? `Answer: ${ans}` : '—'} {correct ? '✓' : '✗'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>,
                  ]
                : []),
            ])}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <p style={{ color: 'var(--color-gray-600)', marginTop: '1rem' }}>No assessments match your filters.</p>
      )}
    </div>
  );
}
