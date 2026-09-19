/** Keep the blended course estimate visible while disclosing incomplete provider reads. */
export default function CourseraProgressCoverageNotice({
  coverage,
}: {
  coverage?: 'complete' | 'capped' | 'unavailable' | 'unknown';
}) {
  if (coverage !== 'capped' && coverage !== 'unavailable') return null;

  return (
    <p className="wa-kit-training-notice" role="status">
      {coverage === 'capped'
        ? 'Coursera’s latest update is incomplete.'
        : 'Coursera could not be fully refreshed.'}{' '}
      Progress shown uses available course records.
    </p>
  );
}
