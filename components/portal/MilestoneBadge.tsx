/**
 * MilestoneBadge — small visual chip for the member dashboard.
 *
 * G5 retention loop celebrates four moments:
 *   - first_course_complete  → "First course complete"
 *   - first_cert_earned      → "First cert earned"
 *   - three_applications     → "3 applications submitted"
 *   - halfway_program        → "Halfway through your program"
 *
 * Stateless and presentational. The dashboard decides which milestones to
 * render and feeds in `{ type, earnedAt }`; this component handles label,
 * icon, and visual treatment using theme tokens (no literal whites).
 */

type MilestoneType =
  | 'first_course_complete'
  | 'first_cert_earned'
  | 'three_applications'
  | 'halfway_program';

export type Milestone = {
  type: MilestoneType;
  earnedAt: Date | string;
};

type MilestoneBadgeProps = Milestone & {
  /** Compact form (just the chip, no date sub-label). */
  compact?: boolean;
};

const COPY: Record<MilestoneType, { label: string; icon: string; tone: 'primary' | 'success' | 'accent' }> = {
  first_course_complete: {
    label: 'First course complete',
    icon: 'school',
    tone: 'primary',
  },
  first_cert_earned: {
    label: 'First cert earned',
    icon: 'workspace_premium',
    tone: 'accent',
  },
  three_applications: {
    label: '3 applications submitted',
    icon: 'send',
    tone: 'primary',
  },
  halfway_program: {
    label: 'Halfway through your program',
    icon: 'flag',
    tone: 'success',
  },
};

function toneStyles(tone: 'primary' | 'success' | 'accent') {
  // Background gets a tinted surface via color-mix to avoid hard whites.
  switch (tone) {
    case 'success':
      return {
        background: 'color-mix(in srgb, var(--color-success, #4a9b4f) 12%, var(--color-surface))',
        border: '1px solid color-mix(in srgb, var(--color-success, #4a9b4f) 35%, transparent)',
        iconColor: 'var(--color-success, #4a9b4f)',
        labelColor: 'var(--color-text-strong, var(--color-text))',
      };
    case 'accent':
      return {
        background: 'color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))',
        border: '1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)',
        iconColor: 'var(--color-accent-dark, var(--color-accent))',
        labelColor: 'var(--color-text-strong, var(--color-text))',
      };
    case 'primary':
    default:
      return {
        background: 'color-mix(in srgb, var(--color-primary, var(--color-accent)) 10%, var(--color-surface))',
        border: '1px solid color-mix(in srgb, var(--color-primary, var(--color-accent)) 30%, transparent)',
        iconColor: 'var(--color-primary, var(--color-accent))',
        labelColor: 'var(--color-text-strong, var(--color-text))',
      };
  }
}

function formatEarned(earnedAt: Date | string): string {
  const date = earnedAt instanceof Date ? earnedAt : new Date(earnedAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MilestoneBadge({ type, earnedAt, compact }: MilestoneBadgeProps) {
  const copy = COPY[type];
  if (!copy) return null;
  const tone = toneStyles(copy.tone);
  const dateLabel = formatEarned(earnedAt);

  return (
    <div
      role="status"
      aria-label={`Milestone: ${copy.label}${dateLabel ? `, earned ${dateLabel}` : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: compact ? '0.3rem 0.65rem' : '0.45rem 0.85rem',
        borderRadius: '999px',
        background: tone.background,
        border: tone.border,
        color: tone.labelColor,
        fontSize: compact ? '0.78rem' : '0.85rem',
        fontWeight: 600,
        lineHeight: 1.2,
        maxWidth: '100%',
      }}
    >
      <span
        className="material-symbols-outlined"
        aria-hidden="true"
        style={{
          fontSize: compact ? '1rem' : '1.15rem',
          color: tone.iconColor,
        }}
      >
        {copy.icon}
      </span>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {copy.label}
      </span>
      {!compact && dateLabel ? (
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 500,
            color: 'var(--color-text-muted, var(--color-text))',
            opacity: 0.75,
          }}
        >
          · {dateLabel}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Helper: small array of milestone types in display order, for dashboards
 * iterating over earned milestones.
 */
export const MILESTONE_DISPLAY_ORDER: MilestoneType[] = [
  'first_course_complete',
  'first_cert_earned',
  'three_applications',
  'halfway_program',
];
