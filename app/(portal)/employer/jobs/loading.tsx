export default function EmployerJobsLoading() {
  return (
    <div className="employer-jobs-page employer-jobs-page--loading" aria-busy="true" aria-label="Loading job postings">
      <div className="employer-jobs-skeleton-header">
        <div className="employer-jobs-skeleton-line employer-jobs-skeleton-line--title" />
        <div className="employer-jobs-skeleton-line employer-jobs-skeleton-line--sub" />
      </div>
      <div className="employer-jobs-skeleton-summary">
        <div className="employer-jobs-skeleton-pill" />
        <div className="employer-jobs-skeleton-pill" />
        <div className="employer-jobs-skeleton-pill" />
      </div>
      <div className="employer-jobs-skeleton-filters">
        <div className="employer-jobs-skeleton-chip" />
        <div className="employer-jobs-skeleton-chip" />
        <div className="employer-jobs-skeleton-chip" />
      </div>
      <ul className="employer-jobs-board__grid" role="list">
        {[1, 2, 3].map((i) => (
          <li key={i}>
            <div className="employer-job-card employer-job-card--skeleton">
              <div className="employer-jobs-skeleton-line employer-jobs-skeleton-line--badge" />
              <div className="employer-jobs-skeleton-line employer-jobs-skeleton-line--heading" />
              <div className="employer-jobs-skeleton-line employer-jobs-skeleton-line--meta" />
              <div className="employer-jobs-skeleton-line employer-jobs-skeleton-line--body" />
              <div className="employer-jobs-skeleton-actions">
                <div className="employer-jobs-skeleton-btn" />
                <div className="employer-jobs-skeleton-btn" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
