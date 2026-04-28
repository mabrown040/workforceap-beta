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
    jobSearchEngines,
  } = context;

  const hasContext = location || programShortLabel || applicationsCount > 0 || jobSearchUrl;
  const hasActions = recommendedActions.length > 0;

  return (
    <div className="career-brief-for-you">
      <h2 className="career-brief-for-you-title">For You</h2>
      <div className="career-brief-for-you-content">
        {!hasContext && !hasActions ? (
          <p className="career-brief-for-you-line" style={{ color: 'var(--color-on-surface-variant)', marginBottom: 0 }}>
            Personalized tips will appear here as you add your location, program interests, and applications. Until then, use the
            weekly briefs below and explore the{' '}
            <a href="/dashboard/ai-tools" className="career-brief-for-you-link">
              AI Career Toolkit
            </a>
            .
          </p>
        ) : null}
        {programShortLabel && (
          <p className="career-brief-for-you-line">
            You&rsquo;re targeting <strong>{programShortLabel}</strong>
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
            You&rsquo;ve logged {applicationsCount} application{applicationsCount !== 1 ? 's' : ''} so far.
          </p>
        )}
        {jobSearchUrl && (
          <div className="career-brief-for-you-line">
            <a href={jobSearchUrl} target="_blank" rel="noopener noreferrer" className="career-brief-for-you-link">
              Search jobs in your area →
            </a>
            {jobSearchEngines.length > 1 ? (
              <p style={{ margin: '0.4rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>
                Also useful: {jobSearchEngines.slice(1).map((engine, index) => (
                  <span key={engine.label}>
                    {index > 0 ? ' · ' : ''}
                    <a href={engine.href} target="_blank" rel="noopener noreferrer" className="career-brief-for-you-link">
                      {engine.label}
                    </a>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
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
