import Link from 'next/link';
import type { CareerBriefContext } from '@/lib/content/careerBriefPersonalization';

type CareerBriefForYouProps = {
  context: CareerBriefContext;
};

export default function CareerBriefForYou({ context }: CareerBriefForYouProps) {
  const {
    location,
    programShortLabel,
    applicationsCount,
    recommendedActions,
    jobSearchUrl,
  } = context;

  const hasContext = location || programShortLabel || applicationsCount > 0 || jobSearchUrl;
  const hasActions = recommendedActions.length > 0;

  if (!hasContext && !hasActions) {
    return null;
  }

  return (
    <div className="career-brief-for-you">
      <h2 className="career-brief-for-you-title">For You</h2>
      <div className="career-brief-for-you-content">
        {programShortLabel && (
          <p className="career-brief-for-you-line">
            You&apos;re targeting <strong>{programShortLabel}</strong>
            {location && (
              <> in <strong>{location}</strong></>
            )}
            .
          </p>
        )}
        {location && !programShortLabel && (
          <p className="career-brief-for-you-line">
            Based in <strong>{location}</strong>.
          </p>
        )}
        {applicationsCount > 0 && (
          <p className="career-brief-for-you-line">
            You&apos;ve logged {applicationsCount} application{applicationsCount !== 1 ? 's' : ''} so far.
          </p>
        )}
        {jobSearchUrl && (
          <p className="career-brief-for-you-line">
            <a href={jobSearchUrl} target="_blank" rel="noopener noreferrer" className="career-brief-for-you-link">
              Search jobs in your area →
            </a>
          </p>
        )}
        {recommendedActions.length > 0 && (
          <div className="career-brief-for-you-actions">
            <p className="career-brief-for-you-subtitle">Recommended this week:</p>
            <ul className="career-brief-for-you-list">
              {recommendedActions.map((action) => (
                <li key={action.href}>
                  <Link href={action.href} className="career-brief-for-you-action-link">
                    {action.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
