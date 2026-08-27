import Link from 'next/link';
import { MessageCircle, Target } from 'lucide-react';
import type { ProactiveInsight } from '@/lib/member/proactiveInsights';
import ProactiveInsightCard from './ProactiveInsightCard';
import styles from './TodayHero.module.css';

export type TodayHeroProps = {
  firstName: string;
  /** Pre-formatted "today" date string (caller uses formatPortalDate). */
  dateLabel: string;
  /** True for members with no application yet → first-time welcome tone. */
  isNewMember: boolean;
  /**
   * One warm line describing today's focus, derived server-side from active
   * goals / nextBestActions. e.g. "Today's focus: finish your résumé draft."
   */
  focusLine: string;
  /** Optional secondary context line, e.g. program title. */
  contextLine?: string | null;
  /** 0–2 proactive "we noticed…" cards. */
  insights: ProactiveInsight[];
  /** Time-of-day greeting phrase from server (e.g. "Good morning"). */
  greetingPhrase?: string;
};

/**
 * Personalized "Today" hero for the top of the member dashboard. Additive layer
 * over the existing dashboard — warm greeting, a single "your focus today" line,
 * quick entry to the coach + goals, and any proactive insight cards.
 *
 * Renders the same on mobile and desktop; the parent page mounts it inside both
 * trees with the appropriate horizontal padding.
 */
export default function TodayHero({
  firstName,
  dateLabel,
  isNewMember,
  focusLine,
  contextLine,
  insights,
}: TodayHeroProps) {
  const name = firstName?.trim() || 'there';
  const greeting = isNewMember ? `Welcome, ${name}` : name;

  return (
    <section className={styles.hero} aria-label="Today">
      <div className={styles.glow} aria-hidden />

      <div className={styles.head}>
        <span className={styles.date}>{dateLabel}</span>
        <h2 className={styles.greeting}>{greeting}</h2>
        <p className={styles.focus}>
          <span className={styles.focusLabel}>Today&apos;s focus</span>
          <span className={styles.focusText}>{focusLine}</span>
        </p>
        {contextLine ? <p className={styles.context}>{contextLine}</p> : null}
      </div>

      <div className={styles.quickRow}>
        <Link href="/coach" className={`${styles.quick} ${styles.quickPrimary}`}>
          <span className={styles.quickGlyph} aria-hidden>
            <MessageCircle size={18} strokeWidth={2.25} />
          </span>
          <span className={styles.quickBody}>
            <span className={styles.quickTitle}>Counselor chat</span>
            <span className={styles.quickSub}>Open messages</span>
          </span>
        </Link>
        <Link href="/dashboard#goals" className={styles.quick}>
          <span className={styles.quickGlyph} aria-hidden>
            <Target size={18} strokeWidth={2.25} />
          </span>
          <span className={styles.quickBody}>
            <span className={styles.quickTitle}>Goals</span>
            <span className={styles.quickSub}>Open your next steps</span>
          </span>
        </Link>
      </div>

      {insights.length > 0 ? (
        <div className={styles.insights} aria-label="We noticed">
          {insights.map((insight) => (
            <ProactiveInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
