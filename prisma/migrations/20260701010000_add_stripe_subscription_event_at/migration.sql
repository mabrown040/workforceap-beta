-- Stripe does not guarantee webhook delivery order. The employer webhook handler
-- (app/api/employer/webhook/route.ts) previously compared current DB state to the
-- event's implied end-state with no ordering guard, so a delayed
-- `invoice.payment_failed` arriving after a newer `invoice.payment_succeeded` could
-- incorrectly regress a subscription to `past_due`. This column stores the Stripe
-- `event.created` (epoch seconds) of the last event that was allowed to mutate
-- tier/subscription-status fields, so handlers can skip out-of-order events instead
-- of blindly overwriting newer state with stale state.

ALTER TABLE "employers"
  ADD COLUMN IF NOT EXISTS "stripe_subscription_event_at" INTEGER;
