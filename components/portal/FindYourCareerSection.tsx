import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type Props = { compact?: boolean };

export default function FindYourCareerSection({ compact }: Props) {
  if (compact) {
    const linkStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '1rem',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--surface-container-lowest)',
      border: '1px solid var(--outline-variant)',
      boxShadow: 'var(--shadow-sm)',
      textDecoration: 'none',
      color: 'inherit',
    };
    return (
      <section style={{ margin: '0 1.5rem 1.5rem' }}>
        <h5 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
          Find your career
        </h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/dashboard/learning/find-your-career" style={linkStyle}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.25rem' }} aria-hidden="true">explore</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-on-surface)' }}>O*NET Interest Profiler</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>RIASEC interests · 30 questions</div>
            </div>
          </Link>
          <Link href="/dashboard/ai-tools/skill-mapper" style={linkStyle}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.25rem' }} aria-hidden="true">radar</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-on-surface)' }}>O*NET skill mapping</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Explore occupation skills &amp; gaps</div>
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
