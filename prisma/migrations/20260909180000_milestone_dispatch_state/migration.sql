-- Additive only: historical cascades remain unchanged and are never resent implicitly.
ALTER TABLE public.milestone_cascades
  ADD COLUMN IF NOT EXISTS dispatch_state JSONB;
