-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "placement_survey_wave" AS ENUM ('thirty_day', 'sixty_day', 'ninety_day');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add wave column with default for existing rows
ALTER TABLE "placement_surveys" ADD COLUMN "wave" "placement_survey_wave" NOT NULL DEFAULT 'thirty_day';

-- Drop old unique constraint on user_id
ALTER TABLE "placement_surveys" DROP CONSTRAINT IF EXISTS "placement_surveys_user_id_key";

-- Create new composite unique index
CREATE UNIQUE INDEX "placement_surveys_user_id_wave_key" ON "placement_surveys"("user_id", "wave");

-- Ensure regular index on user_id still exists (Prisma requires it for the relation)
CREATE INDEX IF NOT EXISTS "placement_surveys_user_id_idx" ON "placement_surveys"("user_id");
