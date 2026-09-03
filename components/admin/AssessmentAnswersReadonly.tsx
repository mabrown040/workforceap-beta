import type { AssessmentReviewRow } from '@/lib/assessment/reviewRows';

type Props = {
  rows: AssessmentReviewRow[];
  score: number | null;
  scorePct: number | null;
  completedAt: Date | string | null;
  programInterest?: string | null;
  /** Section heading; defaults to the member-facing name of the check. */
  title?: string;
};

/**
 * Staff-facing preassessment answer sheet (admin member detail, counselor
 * student detail). Rows come from the server-only review helper so the
 * answer key never reaches the browser.
 */
export default function AssessmentAnswersReadonly({
  rows,
  score,
  scorePct,
  completedAt,
  programInterest,
  title = 'Training preassessment (skills check)',
}: Props) {
  const completed = completedAt ? new Date(completedAt) : null;
  const correctCount = rows.filter((r) => r.correct).length;
  return (
    <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>
        {completed ? `Submitted ${completed.toLocaleString()}` : 'Submitted'}
        {score != null ? ` · Score ${score} (${scorePct ?? 0}%)` : ''}
        {` · ${correctCount}/${rows.length} correct`}
        {programInterest ? ` · Interest: ${programInterest}` : ''}
      </p>
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
          Full answer sheet ({rows.length} questions)
        </summary>
        <ol style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
          {rows.map((r) => (
            <li key={r.id} style={{ marginBottom: '0.25rem' }}>
              <span>{r.question}</span>
              {' — '}
              <strong>{r.answer ? `${r.answer}: ${r.answerLabel ?? ''}` : 'not answered'}</strong>{' '}
              <span
                aria-label={r.correct ? 'correct' : 'incorrect'}
                style={{ color: r.correct ? 'var(--color-success, #2e7d32)' : 'var(--color-error, #b3261e)', fontWeight: 700 }}
              >
                {r.correct ? '✓' : '✗'}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
