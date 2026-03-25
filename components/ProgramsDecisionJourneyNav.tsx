import Link from 'next/link';

export type ProgramsJourneyStep = 'quiz' | 'programs' | 'detail' | 'compare' | 'salary';

/**
 * Shared wayfinding across the public programs decision stack (quiz → browse → compare → salaries → apply).
 */
export default function ProgramsDecisionJourneyNav({
  current,
  quizPhase,
}: {
  current: ProgramsJourneyStep;
  /** On /find-your-path: highlight only Quiz while answering; show full path on results. */
  quizPhase?: 'in_progress' | 'results';
}) {
  const steps: { id: ProgramsJourneyStep; label: string; short: string; href: string }[] = [
    { id: 'quiz', label: 'Find Your Career', short: 'Career', href: '/find-your-path' },
    { id: 'programs', label: 'Browse programs', short: 'Browse', href: '/programs' },
    { id: 'compare', label: 'Compare tracks', short: 'Compare', href: '/program-comparison' },
    { id: 'salary', label: 'Salary context', short: 'Salaries', href: '/salary-guide' },
  ];

  return (
    <nav className="programs-journey-nav" aria-label="Steps to choose a program">
      <p className="programs-journey-nav__title">Decision path</p>
      <ol className="programs-journey-nav__list">
        {steps.map((s) => {
          const isQuizInProgress = current === 'quiz' && quizPhase === 'in_progress';
          const isHere =
            (current === 'detail' && s.id === 'programs') ||
            (isQuizInProgress ? s.id === 'quiz' : current === s.id);
          return (
            <li key={s.id} className={isHere ? 'programs-journey-nav__item--here' : undefined}>
              <Link
                href={s.href}
                className="programs-journey-nav__link"
                aria-current={
                  current !== 'detail' && (isQuizInProgress ? s.id === 'quiz' : current === s.id) ? 'step' : undefined
                }
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
