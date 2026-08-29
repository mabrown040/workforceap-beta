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
 */

import { z } from 'zod';

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
export const MILESTONE_TYPES = [
  'training_started',
  'first_course_completed',
  'course_completed',
  'program_halfway',
  'program_completed',
] as const;
export type MilestoneType = (typeof MILESTONE_TYPES)[number];

/** TTL for the awaiting_approval step. 72h matches the spec. */
export const MILESTONE_CASCADE_TTL_HOURS = 72;

// ────────────────────────────────────────────────────────────────────────────
//  LLM-produced action drafts
// ────────────────────────────────────────────────────────────────────────────
//
// Allow-listed action types. The LLM is asked to produce ONLY these — anything
// else gets rejected by the discriminated union below. This is the safety
// rail: the LLM cannot invent new action types that bypass the approval UI.
//
// Pilot is email-only. SMS/push live in a follow-up PR.

const CelebrateMilestoneDraftSchema = z.object({
  type: z.literal('celebrate_milestone'),
  channel: z.literal('email'),
  subject: z.string().min(1).max(120),
  body: z.string().min(1).max(4000),
  rationale: z.string().min(1).max(400),
  confidence: z.number().min(0).max(1),
});

const SuggestNextCourseDraftSchema = z.object({
  type: z.literal('suggest_next_course'),
  /** The slug of the course the LLM thinks the learner should start next.
   *  Counselor verifies before any enrollment is performed. */
  courseSlug: z.string().min(1),
  rationale: z.string().min(1).max(400),
  confidence: z.number().min(0).max(1),
});

const RequestPeerPairDraftSchema = z.object({
  type: z.literal('request_peer_pair'),
  /** Pilot: LLM only suggests "consider pairing this learner with someone in
   *  the cohort" — counselor picks the partner. We do not let the LLM
   *  identify another learner by name or ID, to avoid cross-learner PII
   *  leakage in the draft. */
  rationale: z.string().min(1).max(400),
  confidence: z.number().min(0).max(1),
});

const FlagForCounselorCallDraftSchema = z.object({
  type: z.literal('flag_for_counselor_call'),
  rationale: z.string().min(1).max(400),
  confidence: z.number().min(0).max(1),
});

export const ActionDraftSchema = z.discriminatedUnion('type', [
  CelebrateMilestoneDraftSchema,
  SuggestNextCourseDraftSchema,
  RequestPeerPairDraftSchema,
  FlagForCounselorCallDraftSchema,
]);
export type ActionDraft = z.infer<typeof ActionDraftSchema>;
export type ActionDraftType = ActionDraft['type'];

export const CASCADE_DRAFT_RESPONSE_SCHEMA = z.object({
  /** One-sentence counselor brief, ≤280 chars. Used as the card headline
   *  in /admin/agent-inbox. */
  counselorBrief: z.string().min(1).max(280),
  /** 1–5 action drafts. The counselor decides which to approve. */
  actions: z.array(ActionDraftSchema).min(1).max(5),
});
export type CascadeDraftResponse = z.infer<typeof CASCADE_DRAFT_RESPONSE_SCHEMA>;

