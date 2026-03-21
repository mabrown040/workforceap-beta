export default function ApplyPageSkeleton() {
  return (
    <div className="apply-page-skeleton" aria-busy="true" aria-live="polite">
      <p className="apply-page-skeleton__status sr-only">Loading application form</p>
      <div className="apply-progress-bar apply-page-skeleton__progress">
        <div className="apply-page-skeleton__fill" />
      </div>
      <div className="apply-page-skeleton__body">
        <div className="apply-page-skeleton__line apply-page-skeleton__line--title" />
        <div className="apply-page-skeleton__line" />
        <div className="apply-page-skeleton__line apply-page-skeleton__line--short" />
        <div className="apply-page-skeleton__cards">
          <div className="apply-page-skeleton__card" />
          <div className="apply-page-skeleton__card" />
          <div className="apply-page-skeleton__card" />
        </div>
        <div className="apply-page-skeleton__btn" />
      </div>
    </div>
  );
}
