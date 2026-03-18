import Link from 'next/link';

type State = 'A' | 'B' | 'C' | 'D';

type DashboardHomeClientProps = {
  firstName: string;
  state: State;
  programTitle?: string;
  enrolledAt?: Date | null;
  assessmentScorePct?: number | null;
  completedCount: number;
  totalCourses: number;
  nextMilestone?: string;
  recentActivity: Array<{ label: string; timestamp: Date }>;
  checklist: {
    createAccount: boolean;
    chooseProgram: boolean;
    completeAssessment: boolean;
    startFirstCourse: boolean;
    completeFirstCourse: boolean;
  };
  checklistAllDone: boolean;
};

export default function DashboardHomeClient({
  firstName,
  state,
  programTitle,
  enrolledAt,
  assessmentScorePct,
  completedCount,
  totalCourses,
  nextMilestone,
  recentActivity,
  checklist,
  checklistAllDone,
}: DashboardHomeClientProps) {
  return (
    <div>
      {state === 'A' && (
        <>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome, {firstName} 👋</h1>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: '2rem' }}>
            You&apos;re in. Let&apos;s build your career path.
          </p>
          <div style={{ display: 'grid', gap: '1rem', maxWidth: '400px' }}>
            <Link href="/dashboard/program" className="btn btn-primary" style={{ padding: '1rem', textAlign: 'center' }}>
              Choose Your Program
            </Link>
            <Link href="/how-it-works" className="btn btn-outline" style={{ padding: '1rem', textAlign: 'center' }}>
              How It Works
            </Link>
          </div>
        </>
      )}

      {state === 'B' && (
        <>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome back, {firstName}</h1>
          <div
            style={{
              background: 'rgba(74, 155, 79, 0.1)',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.5rem' }}>
              Start your {programTitle} training — complete a quick skills assessment first
            </p>
            <Link href="/dashboard/assessment" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              Take Assessment
            </Link>
          </div>
        </>
      )}

      {state === 'C' && (
        <>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome back, {firstName}</h1>
          <div
            style={{
              background: 'var(--color-light)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '1px solid var(--color-border, #e5e5e5)',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>My Program: {programTitle}</h2>
            <p style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>
              Progress: {completedCount} of {totalCourses} courses complete
            </p>
            <div style={{ height: '8px', background: '#e5e5e5', borderRadius: '4px', marginBottom: '1rem', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${totalCourses > 0 ? (completedCount / totalCourses) * 100 : 0}%`,
                  background: 'var(--color-accent)',
                  borderRadius: '4px',
                }}
              />
            </div>
            <Link href="/dashboard/training" className="btn btn-primary">
              Continue Training
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', marginBottom: '0.25rem' }}>Enrolled</div>
              <div style={{ fontWeight: 600 }}>{enrolledAt?.toLocaleDateString() ?? '—'}</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', marginBottom: '0.25rem' }}>Assessment Score</div>
              <div style={{ fontWeight: 600 }}>{assessmentScorePct ?? '—'}%</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', marginBottom: '0.25rem' }}>Next Milestone</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{nextMilestone ?? '—'}</div>
            </div>
          </div>
          {recentActivity.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Recent activity</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {recentActivity.map((a, i) => (
                  <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.label}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>{a.timestamp.toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {state === 'D' && (
        <>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome back, {firstName}</h1>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(74, 155, 79, 0.15), rgba(74, 155, 79, 0.05))',
              border: '2px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              padding: '2rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>All courses complete!</h2>
            <p style={{ color: 'var(--color-gray-600)', marginBottom: '1rem' }}>
              Congratulations on finishing {programTitle}.
            </p>
            <button type="button" className="btn btn-primary" disabled style={{ opacity: 0.7 }}>
              Download Your Certificate (coming soon)
            </button>
          </div>
        </>
      )}

      {!checklistAllDone && (
        <details
          style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'var(--color-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border, #e5e5e5)',
          }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Onboarding Checklist</summary>
          <ul style={{ marginTop: '1rem', paddingLeft: '1.25rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>{checklist.createAccount ? '✅' : '⬜'} Create account</li>
            <li style={{ marginBottom: '0.5rem' }}>{checklist.chooseProgram ? '✅' : '⬜'} Choose a program</li>
            <li style={{ marginBottom: '0.5rem' }}>{checklist.completeAssessment ? '✅' : '⬜'} Complete skills assessment</li>
            <li style={{ marginBottom: '0.5rem' }}>{checklist.startFirstCourse ? '✅' : '⬜'} Start your first course</li>
            <li style={{ marginBottom: '0.5rem' }}>{checklist.completeFirstCourse ? '✅' : '⬜'} Complete first course</li>
          </ul>
        </details>
      )}
    </div>
  );
}
