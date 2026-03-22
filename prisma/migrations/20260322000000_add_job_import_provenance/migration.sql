ALTER TABLE "jobs"
  ADD COLUMN "source_url" TEXT,
  ADD COLUMN "import_provider" TEXT,
  ADD COLUMN "import_method" TEXT;
