import Link from 'next/link';

export type ProgramsJourneyStep = 'quiz' | 'programs' | 'detail' | 'compare' | 'salary';

/**
 * Sticky tool-switcher nav across the public programs decision stack
 * (quiz → browse → compare → salaries → apply).
 *
 * Sticky below nav (top-24), surface-container-high bg, rounded-xl,
 * 4 tabs with Material Symbols icon + label.
 * Active tab: primary-container bg with shadow.
 */
export default function ProgramsDecisionJourneyNav({
  current,
  quizPhase,
}: {
  current: ProgramsJourneyStep;
  /** On /find-your-path: highlight only Quiz while answering; show full path on results. */
  quizPhase?: 'in_progress' | 'results';
}) {
  const steps: { id: ProgramsJourneyStep; label: string; icon: string; href: string }[] = [
    { id: 'quiz', label: 'Find Your Career', icon: 'explore', href: '/find-your-path' },
    { id: 'programs', label: 'Browse Programs', icon: 'school', href: '/programs' },
    { id: 'compare', label: 'Compare Tracks', icon: 'compare_arrows', href: '/program-comparison' },
    { id: 'salary', label: 'Salary Context', icon: 'payments', href: '/salary-guide' },
  ];

  return (
    <nav className="pdj-nav" aria-label="Steps to choose a program">
      <ol className="pdj-nav__list">
        {steps.map((s) => {
          const isQuizInProgress = current === 'quiz' && quizPhase === 'in_progress';
          const isHere =
            (current === 'detail' && s.id === 'programs') ||
            (isQuizInProgress ? s.id === 'quiz' : current === s.id);
          return (
            <li key={s.id}>
              <Link
                href={s.href}
                className={`pdj-nav__tab${isHere ? ' pdj-nav__tab--active' : ''}`}
                aria-current={
                  current !== 'detail' && (isQuizInProgress ? s.id === 'quiz' : current === s.id) ? 'step' : undefined
                }
              >
                <span
                  className="material-symbols-outlined pdj-nav__icon"
                  style={{ fontVariationSettings: isHere ? "'FILL' 1" : "'FILL' 0" }}
                  aria-hidden
                >
                  {s.icon}
                </span>
                <span className="pdj-nav__label">{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      {current === 'detail' && (
        <p className="pdj-nav__hint">You are viewing a single program — compare below when you want tradeoffs.</p>
      )}

      <style>{`
        .pdj-nav {
          position: sticky;
          top: calc(var(--main-nav-layout-height) + 0.5rem);
          z-index: 40;
          background: var(--surface-container-high);
          border-radius: var(--radius-xl);
          padding: 0.5rem;
          margin: 0 auto 1.5rem;
          max-width: 720px;
        }

        .pdj-nav__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          align-items: stretch;
          gap: 0.25rem;
        }

        .pdj-nav__tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border-radius: var(--radius-lg);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.8125rem;
          color: var(--color-on-surface-variant);
          background: transparent;
          transition: background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
          white-space: nowrap;
          min-height: 44px;
          flex: 1;
          justify-content: center;
        }

        .pdj-nav__tab:hover {
          background: var(--surface-container-highest);
          color: var(--color-on-surface);
        }

        .pdj-nav__tab--active {
          background: rgba(173, 44, 77, 0.15);
          color: var(--color-accent);
          font-weight: 700;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
        }

        .pdj-nav__tab--active:hover {
          background: rgba(173, 44, 77, 0.2);
          color: var(--color-accent);
        }

        .pdj-nav__icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .pdj-nav__tab--active .pdj-nav__icon {
          color: var(--color-accent);
        }

        .pdj-nav__hint {
          margin: 0.5rem 0.5rem 0;
          font-size: 0.8rem;
          color: var(--color-on-surface-variant);
          line-height: 1.4;
          text-align: center;
        }

        @media (max-width: 639px) {
          .pdj-nav {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            top: 4rem;
            border-radius: var(--radius-lg);
          }

          .pdj-nav__list {
            flex-wrap: nowrap;
            min-width: min-content;
          }

          .pdj-nav__label {
            display: none;
          }

          .pdj-nav__tab {
            flex: 0 0 auto;
            padding: 0.5rem 0.75rem;
            min-width: 3rem;
          }
        }
      `}</style>
    </nav>
  );
}
