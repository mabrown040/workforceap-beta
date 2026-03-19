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
  suggestedActions: Array<{ label: string; href: string }>;
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
  suggestedActions,
}: DashboardHomeClientProps) {
  return (
    <div>
      {state === 'A' && (
        <>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome, {firstName} 👋</h1>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
            You&apos;re in. Let&apos;s build your career path.
          </p>
          <div className="dashboard-next-step">
            <h3>Next step: Choose your program</h3>
            <p>
              Select one of our 19 no-cost career programs. This is a one-time choice — funding is tied to a single program enrollment.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Link href="/dashboard/program" className="btn btn-primary" style={{ padding: '0.75rem 1.25rem' }}>
                Choose Your Program
              </Link>
              <Link href="/how-it-works" className="btn btn-outline" style={{ padding: '0.75rem 1.25rem' }}>
                How It Works
              </Link>
            </div>
          </div>
        </>
      )}

      {state === 'B' && (
        <>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome back, {firstName}</h1>
          <div className="dashboard-next-step">
            <h3>Next step: Complete your skills assessment</h3>
            <p>
              Start your {programTitle} training — complete a quick skills assessment first so we can tailor your learning path.
            </p>
            <Link href="/dashboard/assessment" className="btn btn-primary">
              Take Assessment
            </Link>
          </div>
          <div className="dashboard-stats-row">
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-value" style={{ fontSize: '0.95rem' }}>{programTitle ?? '—'}</div>
              <div className="dashboard-stat-label">Program</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-value">{enrolledAt?.toLocaleDateString() ?? '—'}</div>
              <div className="dashboard-stat-label">Enrolled</div>
            </div>
          </div>
        </>
      )}

      {state === 'C' && (
        <>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome back, {firstName}</h1>
          <div className="dashboard-next-step">
            <h3>Next step: {nextMilestone ?? 'Continue training'}</h3>
            <p>
              You&apos;ve completed {completedCount} of {totalCourses} courses. Keep the momentum going.
            </p>
            <Link href="/dashboard/training" className="btn btn-primary">
              Continue Training
            </Link>
          </div>
          <div className="dashboard-program-card">
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
            <Link href="/dashboard/training" className="btn btn-secondary">
              Go to Training
            </Link>
          </div>
          <div className="dashboard-stats-row">
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon">📅</div>
              <div className="dashboard-stat-label">Enrolled</div>
              <div className="dashboard-stat-value">{enrolledAt?.toLocaleDateString() ?? '—'}</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon">📊</div>
              <div className="dashboard-stat-label">Assessment Score</div>
              <div className="dashboard-stat-value">{assessmentScorePct ?? '—'}%</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon">🎯</div>
              <div className="dashboard-stat-label">Next Milestone</div>
              <div className="dashboard-stat-value" style={{ fontSize: '0.95rem' }}>{nextMilestone ?? '—'}</div>
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
            className="dashboard-next-step"
            style={{
              background: 'linear-gradient(135deg, rgba(173, 44, 77, 0.1), rgba(173, 44, 77, 0.04))',
              border: '2px solid var(--color-accent)',
              padding: '2rem',
              textAlign: 'center',
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

      {suggestedActions.length > 0 && (
        <div className="dashboard-suggested">
          <h3>Suggested for you</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: 0 }}>
            Based on your progress — try these AI tools next:
          </p>
          <div className="dashboard-suggested-actions">
            {suggestedActions.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                {a.label} →
              </Link>
            ))}
          </div>
        </div>
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
