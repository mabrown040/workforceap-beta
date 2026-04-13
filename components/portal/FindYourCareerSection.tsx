import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type Props = { compact?: boolean };

/**
 * Replaces a single "Interest Profiler" card with two clear O*NET entry points + skill mapping.
 */
export default function FindYourCareerSection({ compact }: Props) {
  if (compact) {
    return (
      <section style={{ margin: '0 1.5rem 1.5rem' }}>
        <h5 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-[#584144]" style={{ marginBottom: '0.75rem' }}>
          Find your career
        </h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link
            href="/dashboard/learning/find-your-career"
            className="wa-bg-white wa-flex wa-items-center wa-gap-3 wa-p-4 wa-rounded-xl wa-shadow-sm wa-border wa-border-[#e8e0dd]"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <span className="material-symbols-outlined wa-text-[#8c0f37]" aria-hidden="true">explore</span>
            <div>
              <div className="wa-font-semibold wa-text-[#1c1b1b]">O*NET Interest Profiler</div>
              <div className="wa-text-xs wa-text-[#584144]">RIASEC interests · 30 questions</div>
            </div>
          </Link>
          <Link
            href="/dashboard/ai-tools/skill-mapper"
            className="wa-bg-white wa-flex wa-items-center wa-gap-3 wa-p-4 wa-rounded-xl wa-shadow-sm wa-border wa-border-[#e8e0dd]"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <span className="material-symbols-outlined wa-text-[#8c0f37]" aria-hidden="true">radar</span>
            <div>
              <div className="wa-font-semibold wa-text-[#1c1b1b]">O*NET skill mapping</div>
              <div className="wa-text-xs wa-text-[#584144]">Explore occupation skills &amp; gaps</div>
            </div>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="content-section learning-hub-section" style={{ marginBottom: 'var(--space-8)' }}>
      <div className="container">
        <h2 className="learning-hub-section-title">Find your career</h2>
        <p className="learning-hub-section-lead">
          Use O*NET tools in two ways: discover what you like (Interest Profiler) and what roles require (skill mapper). Both
          complement your WorkforceAP program planning.
        </p>
        <ul className="learning-hub-destinations" role="list">
          <li>
            <Link href="/dashboard/learning/find-your-career" className="learning-hub-card">
              <span className="learning-hub-card-icon" aria-hidden>
                <span className="material-symbols-outlined" style={{ fontSize: 28 }} aria-hidden="true">
                  explore
                </span>
              </span>
              <span className="learning-hub-card-body">
                <span className="learning-hub-card-title">O*NET Interest Profiler</span>
                <span className="learning-hub-card-desc">
                  Mini Interest Profiler (30 questions), RIASEC scores, and program alignment.
                </span>
              </span>
              <ChevronRight className="learning-hub-card-chevron" aria-hidden size={22} />
            </Link>
          </li>
          <li>
            <Link href="/dashboard/ai-tools/skill-mapper" className="learning-hub-card">
              <span className="learning-hub-card-icon" aria-hidden>
                <span className="material-symbols-outlined" style={{ fontSize: 28 }} aria-hidden="true">
                  radar
                </span>
              </span>
              <span className="learning-hub-card-body">
                <span className="learning-hub-card-title">O*NET skill mapping</span>
                <span className="learning-hub-card-desc">
                  Visualize skills for occupations and compare to your background — same tool as AI Tools → Skill mapping.
                </span>
              </span>
              <ChevronRight className="learning-hub-card-chevron" aria-hidden size={22} />
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
