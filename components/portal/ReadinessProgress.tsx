'use client';

type ReadinessProgressProps = {
  profileComplete: boolean;
  toolsUsed: number;
  applicationsSubmitted: number;
};

export default function ReadinessProgress({
  profileComplete,
  toolsUsed,
  applicationsSubmitted,
}: ReadinessProgressProps) {
  const items = [
    { label: 'Profile complete', done: profileComplete },
    { label: 'Tools used', done: toolsUsed > 0, value: toolsUsed },
    { label: 'Applications submitted', done: applicationsSubmitted > 0, value: applicationsSubmitted },
  ];

  return (
    <div className="readiness-progress" role="status" aria-label="Readiness progress">
      <div className="readiness-progress-strip">
        {items.map((item) => (
          <div
            key={item.label}
            className={`readiness-progress-item${item.done ? ' done' : ''}`}
            aria-label={`${item.label}: ${item.done ? 'Complete' : 'In progress'}`}
          >
            <span className="readiness-progress-icon" aria-hidden>
              {item.done ? '✓' : '○'}
            </span>
            <span className="readiness-progress-label">{item.label}</span>
            {item.value !== undefined && item.value > 0 && (
              <span className="readiness-progress-value" aria-hidden>
                {item.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
