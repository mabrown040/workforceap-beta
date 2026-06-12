import type { SkillCheckpointSummary } from '@/lib/member/skillCheckpoints';

function statusStyles(status: SkillCheckpointSummary['checkpoints'][number]['status']) {
  switch (status) {
    case 'passed':
      return {
        label: 'Passed',
        bg: 'rgba(74,155,79,0.12)',
        border: 'rgba(74,155,79,0.22)',
        color: '#256b2a',
      };
    case 'needs_retry':
      return {
        label: 'Needs retry',
        bg: 'rgba(194,120,0,0.12)',
        border: 'rgba(194,120,0,0.24)',
        color: '#8a5a00',
      };
    case 'ready':
      return {
        label: 'Ready for review',
        bg: 'rgba(43,123,185,0.12)',
        border: 'rgba(43,123,185,0.22)',
        color: '#245f8e',
      };
    default:
      return {
        label: 'Locked',
        bg: 'rgba(88,65,68,0.08)',
        border: 'rgba(88,65,68,0.14)',
        color: 'var(--color-on-surface-variant)',
      };
  }
}

export default function SkillCheckpointPanel({
  summary,
}: {
  summary: SkillCheckpointSummary | null;
}) {
  if (!summary || summary.totalCount === 0) return null;

  return (
    <section
      style={{
        background: 'var(--surface-container-low)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem',
        border: '1px solid var(--outline-variant)',
        marginBottom: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        <div>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              margin: '0 0 0.25rem',
            }}
          >
            Skill proof
          </p>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
            Checkpoints for {summary.programTitle ?? 'your program'}
          </h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
            Finish the milestone, then get it reviewed so your training turns into employer-ready proof.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <span className="training-status-chip training-status-chip--complete">
            {summary.passedCount} passed
          </span>
          <span className="training-status-chip training-status-chip--progress">
            {summary.readyCount} ready
          </span>
          {summary.retryCount > 0 ? (
            <span className="training-status-chip training-status-chip--pending">
              {summary.retryCount} retry
            </span>
          ) : null}
        </div>
      </div>

      {summary.demonstratedSkillLabels.length > 0 ? (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', fontWeight: 700 }}>
            Demonstrated skills
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {summary.demonstratedSkillLabels.slice(0, 8).map((skill) => (
              <span
                key={skill}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  background: 'rgba(74,155,79,0.1)',
                  border: '1px solid rgba(74,155,79,0.18)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#256b2a',
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: '0.85rem' }}>
        {summary.checkpoints.map((checkpoint) => {
          const style = statusStyles(checkpoint.status);
          return (
            <article
              key={checkpoint.key}
              style={{
                borderRadius: '0.9rem',
                border: '1px solid var(--outline-variant)',
                background: 'var(--surface-container)',
                padding: '0.95rem 1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  marginBottom: '0.5rem',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>{checkpoint.title}</h4>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--color-on-surface-variant)' }}>
                    {checkpoint.milestoneLabel}
                  </p>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '9999px',
                    background: style.bg,
                    border: `1px solid ${style.border}`,
                    color: style.color,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {style.label}
                </span>
              </div>

              <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {checkpoint.scenarioPrompt}
              </p>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                {checkpoint.evidenceHint}
              </p>

              {checkpoint.skillLabels.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.45rem' }}>
                  {checkpoint.skillLabels.slice(0, 5).map((skill) => (
                    <span
                      key={skill}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '9999px',
                        background: 'var(--surface-container-high)',
                        fontSize: '0.74rem',
                        color: 'var(--color-on-surface-variant)',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}

              {checkpoint.latestNotes ? (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                  <strong>Coach note:</strong> {checkpoint.latestNotes}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
