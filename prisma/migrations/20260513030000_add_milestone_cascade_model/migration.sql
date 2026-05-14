-- Milestone Cascades: counselor-reviewable bundles of suggested actions
-- triggered by significant member events (initially, course completion).
--
-- Pilot scope: only the row is inserted at detection time. The LLM drafting,
-- counselor approval UI, and outbound actions land in follow-up PRs. By
-- shipping the table + idempotent detection first, we start capturing
-- milestone events from real traffic immediately while the rest of the
-- pipeline is built around it.
--
-- Idempotency: a unique constraint on (user_id, milestone_type, milestone_ref)
-- means re-firing the detection function for the same milestone is a no-op
-- (the INSERT … ON CONFLICT DO NOTHING in detectCompletionMilestone()
-- absorbs the race). One cascade per (user, milestone) — re-completion of the
-- same course does not generate a second cascade.

CREATE TABLE IF NOT EXISTS "milestone_cascades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,

    -- What kind of milestone (string, not enum, to keep new types cheap to add)
    "milestone_type" TEXT NOT NULL,

    -- The specific thing — for course_completed this is the course slug
    "milestone_ref" TEXT NOT NULL,

    -- Lifecycle. Plain text + CHECK constraint to mirror at_risk_alerts.status
    -- pattern. Enum migrations are painful when the value set grows.
    "status" TEXT NOT NULL DEFAULT 'pending_draft',

    -- Context captured at detection time so a later LLM draft can be
    -- regenerated deterministically without re-querying the world.
    "program_slug" TEXT,
    "context_snapshot" JSONB NOT NULL,
    "source_event_id" TEXT,

    -- LLM-produced fields (populated in a later PR; nullable for now)
    "counselor_brief" TEXT,
    "drafts" JSONB,
    "draft_model" TEXT,
    "draft_prompt_version" TEXT,
    "drafted_at" TIMESTAMPTZ,

    -- Approval flow (populated by counselor actions in a later PR)
    "approved_by_user_id" TEXT,
    "approved_at" TIMESTAMPTZ,
    "dismissed_at" TIMESTAMPTZ,
    "dismissed_reason" TEXT,
    "sent_at" TIMESTAMPTZ,

    -- Cascades expire 72h after creation if not approved or dismissed.
    -- Stale celebrations don't get sent.
    "expires_at" TIMESTAMPTZ NOT NULL,

    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "milestone_cascades_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "milestone_cascades_status_check" CHECK (
      "status" IN ('pending_draft','awaiting_approval','approved','sent','dismissed','expired')
    )
);

-- Idempotency key. One cascade per (user, milestone_type, milestone_ref).
CREATE UNIQUE INDEX IF NOT EXISTS "milestone_cascades_idempotency"
  ON "milestone_cascades" ("user_id", "milestone_type", "milestone_ref");

-- Drives the draft + expiry crons that come in follow-up PRs:
--   - "find me cascades that need an LLM draft"      → WHERE status='pending_draft'
--   - "find me cascades that should be marked expired" → WHERE status='awaiting_approval' AND expires_at < now()
CREATE INDEX IF NOT EXISTS "milestone_cascades_status_expires_idx"
  ON "milestone_cascades" ("status", "expires_at");

-- Drives the per-member admin view ("show me Drew's recent milestones").
CREATE INDEX IF NOT EXISTS "milestone_cascades_user_created_idx"
  ON "milestone_cascades" ("user_id", "created_at" DESC);

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS "milestone_cascades";
