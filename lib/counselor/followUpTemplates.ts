/**
 * Counselor bulk follow-up templates (Sprint R5 — Inbox Zero).
 *
 * Three short message templates the counselor can fan out from the priority
 * queue. The queue surfaces members in three priority buckets (critical /
 * warning / on-track) and each template declares which buckets it is
 * appropriate for via `applicableTo`. The bulk-send route uses this metadata
 * to refuse mismatched template/priority combinations.
 *
 * Placeholders use `{name}` style (matching the user-facing R5 spec). They
 * are expanded by `renderFollowUpTemplate()` below; missing values fall back
 * to neutral generic copy so a half-populated member doesn't receive an
 * obvious "{memberName}" string.
 *
 * The templates live in TypeScript (not the i18n bundle) for two reasons:
 *
 *   1. Counselor messages to members are in English today — i18n on the
 *      member-portal side hasn't shipped multi-language member messaging yet.
 *   2. These strings are sent verbatim into the messages table; treating
 *      them as code (typed, greppable, unit-testable) is safer than treating
 *      them as content that can drift between locales without review.
 */

export type FollowUpAudience = 'critical' | 'warning' | 'all';

export type FollowUpTemplateId = 'check_in' | 'stale_training' | 'application_nudge';

export type FollowUpTemplate = {
  /** Stable id sent over the wire from the queue UI. */
  id: FollowUpTemplateId;
  /** Short label shown in the bulk-action menu. */
  name: string;
  /**
   * Subject line. Threads in this app don't have a per-message subject — the
   * field is kept for parity with the spec and for any future email-relay
   * fallback. The bulk-send route logs it on the audit event.
   */
  subject: string;
  /** Message body. Supports `{memberName}`, `{programName}`, `{certName}`. */
  body: string;
  /** Which priority buckets this template is appropriate for. */
  applicableTo: FollowUpAudience[];
};

export const FOLLOW_UP_TEMPLATES: Record<FollowUpTemplateId, FollowUpTemplate> = {
  check_in: {
    id: 'check_in',
    name: 'Check-in',
    subject: 'Quick check-in',
    body: "Hi {memberName}, how's training going? Reply with any blockers.",
    applicableTo: ['critical', 'warning', 'all'],
  },
  stale_training: {
    id: 'stale_training',
    name: 'Stale training',
    subject: 'Your training has stalled',
    body: "Hi {memberName}, I noticed your {programName} hasn't progressed in 2 weeks. Want to chat 15 min this week?",
    applicableTo: ['critical', 'warning'],
  },
  application_nudge: {
    id: 'application_nudge',
    name: 'Application nudge',
    subject: 'Time to start applying',
    body: "Hi {memberName}, you've got your {certName} now — let's get 3 job apps out this week. I'll help.",
    applicableTo: ['warning', 'all'],
  },
};

export function listFollowUpTemplates(): FollowUpTemplate[] {
  return Object.values(FOLLOW_UP_TEMPLATES);
}

export function getFollowUpTemplate(id: string): FollowUpTemplate | null {
  if (id in FOLLOW_UP_TEMPLATES) {
    return FOLLOW_UP_TEMPLATES[id as FollowUpTemplateId];
  }
  return null;
}

export type FollowUpRenderContext = {
  memberName: string | null | undefined;
  programName?: string | null;
  certName?: string | null;
};

/**
 * Expand a template body with member-specific values. Missing values are
 * replaced with neutral defaults so a partial-data row doesn't surface
 * the placeholder string to the member.
 */
export function renderFollowUpTemplate(
  template: FollowUpTemplate,
  ctx: FollowUpRenderContext,
): string {
  const firstName = (ctx.memberName ?? '').trim().split(/\s+/)[0] || 'there';
  const programName = (ctx.programName ?? '').trim() || 'your training program';
  const certName = (ctx.certName ?? '').trim() || 'your certification';
  return template.body
    .replaceAll('{memberName}', firstName)
    .replaceAll('{programName}', programName)
    .replaceAll('{certName}', certName);
}

/**
 * Returns true when `template` is appropriate for at least one member in the
 * given priority set. The bulk-send route uses this so a counselor can't
 * accidentally fire e.g. an "application_nudge" at a critical-inactive
 * member who has no cert yet.
 */
export function templateMatchesPriorities(
  template: FollowUpTemplate,
  priorities: FollowUpAudience[],
): boolean {
  if (template.applicableTo.includes('all')) return true;
  return priorities.some((p) => template.applicableTo.includes(p));
}
