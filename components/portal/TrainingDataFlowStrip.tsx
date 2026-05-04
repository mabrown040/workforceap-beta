/**
 * Compact “where progress comes from” strip for the member training dashboard.
 */

function StepIconLearn() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden className="training-data-flow-strip__icon-svg">
      <rect x="6" y="10" width="28" height="18" rx="3" fill="rgba(43,123,185,0.15)" stroke="var(--color-blue)" strokeWidth="1.25" />
      <path d="M12 16h16M12 20h10M12 24h14" stroke="var(--color-blue)" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function StepIconXapi() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden className="training-data-flow-strip__icon-svg">
      <circle cx="20" cy="20" r="12" fill="rgba(196,30,58,0.1)" stroke="var(--color-accent)" strokeWidth="1.25" />
      <path d="M14 20h12M20 14v12" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="20" r="3" fill="var(--color-accent)" />
    </svg>
  );
}

function StepIconDashboard() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden className="training-data-flow-strip__icon-svg">
      <rect x="8" y="9" width="24" height="22" rx="2" fill="rgba(74,155,79,0.12)" stroke="var(--color-green)" strokeWidth="1.25" />
      <path d="M12 15h8v6h-8zM22 15h6v4h-6zM12 23h16v4H12z" fill="none" stroke="var(--color-green)" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowBetween() {
  return (
    <span className="training-data-flow-strip__arrow" aria-hidden>
      <svg width="20" height="12" viewBox="0 0 20 12">
        <path d="M1 6h14M11 2l4 4-4 4" fill="none" stroke="var(--outline-variant)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function TrainingDataFlowStrip() {
  return (
    <section
      className="training-data-flow-strip"
      aria-labelledby="training-data-flow-heading"
    >
      <div className="training-data-flow-strip__head">
        <h2 id="training-data-flow-heading" className="training-data-flow-strip__title">
          How your progress shows up here
        </h2>
        <p className="training-data-flow-strip__lede">
          Short path from Coursera to your dashboard — no extra steps on your side.
        </p>
      </div>
      <ol className="training-data-flow-strip__steps">
        <li className="training-data-flow-strip__step">
          <div className="training-data-flow-strip__icon-wrap" aria-hidden>
            <StepIconLearn />
          </div>
          <span className="training-data-flow-strip__step-label">You learn on Coursera</span>
          <span className="training-data-flow-strip__step-hint">Videos, readings, and quizzes</span>
        </li>
        <ArrowBetween />
        <li className="training-data-flow-strip__step">
          <div className="training-data-flow-strip__icon-wrap" aria-hidden>
            <StepIconXapi />
          </div>
          <span className="training-data-flow-strip__step-label">Activity syncs via xAPI</span>
          <span className="training-data-flow-strip__step-hint">Secure statements to WorkforceAP</span>
        </li>
        <ArrowBetween />
        <li className="training-data-flow-strip__step">
          <div className="training-data-flow-strip__icon-wrap" aria-hidden>
            <StepIconDashboard />
          </div>
          <span className="training-data-flow-strip__step-label">Progress on this page</span>
          <span className="training-data-flow-strip__step-hint">Bars, status, and completion</span>
        </li>
      </ol>
    </section>
  );
}
