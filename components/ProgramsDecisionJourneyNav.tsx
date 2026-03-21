import Link from 'next/link';

export type ProgramsJourneyStep = 'quiz' | 'programs' | 'detail' | 'compare' | 'salary';

/**
 * Shared wayfinding across the public programs decision stack (quiz → browse → compare → salaries → apply).
 */
export default function ProgramsDecisionJourneyNav({ current }: { current: ProgramsJourneyStep }) {
  const steps: { id: ProgramsJourneyStep; label: string; short: string; href: string }[] = [
    { id: 'quiz', label: 'Find fit', short: 'Quiz', href: '/find-your-path' },
    { id: 'programs', label: 'Browse programs', short: 'Browse', href: '/programs' },
    { id: 'compare', label: 'Compare tracks', short: 'Compare', href: '/program-comparison' },
    { id: 'salary', label: 'Salary context', short: 'Salaries', href: '/salary-guide' },
  ];

  return (
    <nav className="programs-journey-nav" aria-label="Steps to choose a program">
      <p className="programs-journey-nav__title">Decision path</p>
      <ol className="programs-journey-nav__list">
        {steps.map((s) => {
          const isHere =
            current === s.id || (current === 'detail' && s.id === 'programs');
          return (
            <li key={s.id} className={isHere ? 'programs-journey-nav__item--here' : undefined}>
              <Link
                href={s.href}
                className="programs-journey-nav__link"
                aria-current={current !== 'detail' && current === s.id ? 'step' : undefined}
              >
                <span className="programs-journey-nav__short">{s.short}</span>
                <span className="programs-journey-nav__full">{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      {current === 'detail' && (
        <p className="programs-journey-nav__detail-hint">You are viewing a single program — compare below when you want tradeoffs.</p>
      )}
    </nav>
  );
}
