-- PlacedOutcome: WorkforceAP-reported placements for metrics (homepage when count >= 10)
CREATE TABLE IF NOT EXISTS "placed_outcomes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "employer_name" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "starting_salary" INTEGER,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "program_slug" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placed_outcomes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "placed_outcomes_user_id_key" ON "placed_outcomes"("user_id");
CREATE INDEX IF NOT EXISTS "placed_outcomes_placed_at_idx" ON "placed_outcomes"("placed_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'placed_outcomes_user_id_fkey'
  ) THEN
    ALTER TABLE "placed_outcomes" ADD CONSTRAINT "placed_outcomes_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Partner self-registration queue
CREATE TABLE IF NOT EXISTS "partner_signup_requests" (
    "id" TEXT NOT NULL,
    "organization_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "org_type" TEXT NOT NULL,
    "expected_monthly" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_signup_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "partner_signup_requests_status_idx" ON "partner_signup_requests"("status");
