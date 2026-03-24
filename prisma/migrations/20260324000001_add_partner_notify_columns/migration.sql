-- Add notification preference columns to partners table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'notify_on_enrollment'
  ) THEN
    ALTER TABLE "partners" ADD COLUMN "notify_on_enrollment" BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'notify_on_course'
  ) THEN
    ALTER TABLE "partners" ADD COLUMN "notify_on_course" BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'notify_on_certified'
  ) THEN
    ALTER TABLE "partners" ADD COLUMN "notify_on_certified" BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'notify_on_placed'
  ) THEN
    ALTER TABLE "partners" ADD COLUMN "notify_on_placed" BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;
