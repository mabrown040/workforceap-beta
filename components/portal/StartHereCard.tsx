import Link from 'next/link';

const CTAS = [
  {
    href: '/ai-tools',
    label: 'Build Resume',
    description: 'Use AI to strengthen your resume',
    icon: '📄',
  },
  {
    href: '/ai-tools',
    label: 'Practice Interview',
    description: 'Prepare with role-specific questions',
    icon: '🎤',
  },
  {
    href: '/learning',
    label: 'Start Learning Path',
    description: 'Explore courses and certifications',
    icon: '📚',
  },
] as const;

export default function StartHereCard() {
  return (
    <div className="start-here-card" role="region" aria-labelledby="start-here-title">
      <h2 id="start-here-title" className="start-here-title">
        Start Here
      </h2>
      <p className="start-here-subtitle">Your next steps to get job-ready</p>
      <div className="start-here-ctas">
        {CTAS.map((cta) => (
          <Link
            key={cta.label}
            href={cta.href}
            className="start-here-cta"
            aria-label={`${cta.label}: ${cta.description}`}
          >
            <span className="start-here-cta-icon" aria-hidden>
              {cta.icon}
            </span>
            <div className="start-here-cta-content">
              <span className="start-here-cta-label">{cta.label}</span>
              <span className="start-here-cta-desc">{cta.description}</span>
            </div>
            <span className="start-here-cta-arrow" aria-hidden>
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
