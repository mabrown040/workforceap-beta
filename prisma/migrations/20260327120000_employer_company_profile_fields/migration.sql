-- Employer portal: optional company size and industry for settings form
ALTER TABLE "employers" ADD COLUMN IF NOT EXISTS "company_size" TEXT;
ALTER TABLE "employers" ADD COLUMN IF NOT EXISTS "industry" TEXT;
