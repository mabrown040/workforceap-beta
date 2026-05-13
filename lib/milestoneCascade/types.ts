/**
 * Shared types for the milestone cascade pipeline.
 *
 * The cascade flow is:
 *   1. detect       — an event handler notices a milestone and inserts a row
 *                     in `milestone_cascades` (status='pending_draft').
 *   2. draft        — a cron picks up pending_draft rows, calls an LLM to
 *                     generate a counselor brief + action drafts
 *                     (status → 'awaiting_approval').
 *   3. review       — a counselor opens /admin/agent-inbox and either
 *                     approves (→ 'approved' → 'sent') or dismisses
 *                     (→ 'dismissed'). 72h TTL expires unreviewed cascades
 *                     (→ 'expired').
 *
 * This module ships step 1 only. Types for later steps live alongside their
 * implementations; types that span the pipeline live here.
 */

export const MILESTONE_CASCADE_STATUSES = [
  'pending_draft',
  'awaiting_approval',
  'approved',
  'sent',
  'dismissed',
  'expired',
] as const;
export type MilestoneCascadeStatus = (typeof MILESTONE_CASCADE_STATUSES)[number];

/**
 * Allow-listed milestone types. Adding a new type means:
 *   1. extend this union,
 *   2. add a builder in lib/milestoneCascade/build*.ts,
 *   3. wire the trigger from wherever the milestone is detected.
 *
 * Plain text in the DB (not a Prisma enum) so adding values doesn't require
 * a migration.
 */
export const MILESTONE_TYPES = ['course_completed'] as const;
export type MilestoneType = (typeof MILESTONE_TYPES)[number];

/** TTL for the awaiting_approval step. 72h matches the spec. */
export const MILESTONE_CASCADE_TTL_HOURS = 72;
