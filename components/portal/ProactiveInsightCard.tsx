import Link from 'next/link';
import type { ProactiveInsight } from '@/lib/member/proactiveInsights';
import styles from './ProactiveInsightCard.module.css';

/**
 * A single "we noticed…" proactive insight card. Pure presentational — receives
 * a {@link ProactiveInsight} already built by `lib/member/proactiveInsights.ts`.
 * Rendered inside the Today hero on both the mobile and desktop dashboard trees.
 */
export default function ProactiveInsightCard({ insight }: { insight: ProactiveInsight }) {
  return (
    <Link
      href={insight.href}
      className={styles.card}
      data-tone={insight.tone}
      aria-label={`${insight.title}. ${insight.cta}`}
    >
      <span className={styles.glyph} aria-hidden>
        {insight.glyph}
      </span>
      <span className={styles.body}>
        <span className={styles.eyebrow}>{insight.eyebrow}</span>
        <span className={styles.title}>{insight.title}</span>
        <span className={styles.text}>{insight.body}</span>
        <span className={styles.cta}>
          {insight.cta}
          <svg
            className={styles.arrow}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      </span>
    </Link>
  );
}
