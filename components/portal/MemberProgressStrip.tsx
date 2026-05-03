type Props = {
  intake: boolean;
  assessment: boolean;
  trainingStarted: boolean;
  certsComplete: boolean;
  employed: boolean;
};

const STEPS: { key: keyof Props; label: string }[] = [
  { key: 'intake', label: 'Intake' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'trainingStarted', label: 'Training' },
  { key: 'certsComplete', label: 'Certs' },
  { key: 'employed', label: 'Employed' },
];

export default function MemberProgressStrip(props: Props) {
  // Determine which step is the current "active" one (first not done)
  const doneValues = STEPS.map((s) => props[s.key]);
  const currentIndex = doneValues.findIndex((v) => !v);

  return (
    <div
      role="list"
      aria-label="Member journey progress"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        padding: '0.75rem 1rem',
        background: 'var(--surface-container-low)',
        borderRadius: '0.875rem',
        border: '1px solid var(--outline-variant)',
        overflowX: 'auto',
      }}
    >
      {STEPS.map((step, i) => {
        const done = props[step.key];
        const isCurrent = !done && i === currentIndex;
        const isFuture = !done && i > currentIndex;

        return (
          <div
            key={step.key}
            role="listitem"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              minWidth: 0,
              position: 'relative',
            }}
          >
            {/* Connector line — left half */}
            {i > 0 && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: '0.5625rem',
                  left: 0,
                  width: '50%',
                  height: '2px',
                  background: doneValues[i - 1]
                    ? 'var(--color-accent)'
                    : 'var(--outline-variant)',
                }}
              />
            )}

            {/* Connector line — right half */}
            {i < STEPS.length - 1 && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: '0.5625rem',
                  right: 0,
                  width: '50%',
                  height: '2px',
                  background: done
                    ? 'var(--color-accent)'
                    : 'var(--outline-variant)',
                }}
              />
            )}

            {/* Circle */}
            <div
              aria-label={
                done
                  ? `${step.label}: complete`
                  : isCurrent
                    ? `${step.label}: in progress`
                    : `${step.label}: upcoming`
              }
              style={{
                width: '1.125rem',
                height: '1.125rem',
                borderRadius: '50%',
                flexShrink: 0,
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: done
                  ? 'var(--color-accent)'
                  : isCurrent
                    ? '#fff'
                    : 'var(--surface-container-low)',
                border: done
                  ? '2px solid var(--color-accent)'
                  : isCurrent
                    ? '2px solid var(--color-accent)'
                    : '2px solid var(--outline-variant)',
                opacity: isFuture ? 0.45 : 1,
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              {done && (
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{
                    fontSize: '0.6875rem',
                    color: '#fff',
                    fontVariationSettings: "'FILL' 1",
                    lineHeight: 1,
                  }}
                >
                  check
                </span>
              )}
              {isCurrent && (
                <div
                  aria-hidden
                  style={{
                    width: '0.4375rem',
                    height: '0.4375rem',
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                  }}
                />
              )}
            </div>

            {/* Label */}
            <span
              aria-hidden
              style={{
                marginTop: '0.3125rem',
                fontSize: '0.5625rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textAlign: 'center',
                lineHeight: 1.2,
                color: done
                  ? 'var(--color-accent)'
                  : isCurrent
                    ? 'var(--color-on-surface)'
                    : 'var(--color-on-surface-variant)',
                opacity: isFuture ? 0.45 : 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                paddingLeft: '0.125rem',
                paddingRight: '0.125rem',
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
