/** Public job board grid skeleton (matches `.job-card--skeleton` in main.css). */
export default function JobsBoardSkeleton() {
  return (
    <div className="jobs-board-skeleton-wrap" aria-busy="true" aria-label="Loading job listings">
      <div className="jobs-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="job-card job-card--skeleton" aria-hidden>
            <div className="job-card__logo job-card__logo--skeleton" />
            <div className="job-card__body">
              <div className="job-card__skeleton-line job-card__skeleton-line--title" />
              <div className="job-card__skeleton-line job-card__skeleton-line--company" />
              <div className="job-card__meta">
                <div className="job-card__skeleton-line job-card__skeleton-line--meta" />
                <div className="job-card__skeleton-line job-card__skeleton-line--meta" />
              </div>
              <div className="job-card__skeleton-line job-card__skeleton-line--salary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
