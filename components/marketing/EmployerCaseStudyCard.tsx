import type { EmployerCaseStudy } from '@/lib/content/employer-case-studies';

type EmployerCaseStudyCardProps = {
  study: EmployerCaseStudy;
  variant?: 'default' | 'accent';
  /** Short trust cue that the card is illustrative, not verified proof. */
  scenarioLabel?: string;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function EmployerCaseStudyCard({
  study,
  variant = 'default',
  scenarioLabel,
}: EmployerCaseStudyCardProps) {
  const isAccent = variant === 'accent';

  return (
    <article
      className={`wa-emp-card${isAccent ? ' wa-emp-card--accent' : ''}`}
      aria-label={scenarioLabel ? `${scenarioLabel}: ${study.company}` : study.company}
    >
      <header className="wa-emp-card__head">
        {scenarioLabel ? (
          <span className="wa-emp-card__scenario">{scenarioLabel}</span>
        ) : null}
        <span className="wa-emp-card__label">
          {study.company} · {study.industry}
        </span>
        <span className="wa-emp-card__meta">{study.location}</span>
      </header>

      <p className="wa-emp-card__role">{study.role_filled}</p>

      {study.quote ? (
        study.attribution_name ? (
          <blockquote className="wa-emp-card__quote">
            &ldquo;{study.quote}&rdquo;
          </blockquote>
        ) : (
          <p className="wa-emp-card__quote wa-emp-card__quote--plain">{study.quote}</p>
        )
      ) : null}

      {study.attribution_name ? (
        <footer className="wa-emp-card__attr">
          <div aria-hidden="true" className="wa-emp-card__avatar">
            {getInitials(study.attribution_name)}
          </div>
          <div className="wa-emp-card__attr-text">
            <span className="wa-emp-card__attr-name">{study.attribution_name}</span>
            <span className="wa-emp-card__attr-title">
              {study.attribution_title}
              {study.attribution_title && study.company ? ', ' : ''}
              {study.company}
            </span>
          </div>
        </footer>
      ) : null}
    </article>
  );
}
