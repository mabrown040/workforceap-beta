-- Synthetic idempotency key for xAPI statements that arrive without a statementId.
-- Prevents duplicate webhook deliveries from double-firing completion emails.

ALTER TABLE "xapi_statements"
  ADD COLUMN IF NOT EXISTS "statement_hash" TEXT;

-- Partial index for fast lookups of hashed statements.
CREATE INDEX IF NOT EXISTS "xapi_statements_statement_hash_idx"
  ON "xapi_statements" ("statement_hash")
  WHERE "statement_hash" IS NOT NULL;

-- Unique constraint so duplicate deliveries trigger Prisma P2002.
-- NULL values are excluded automatically by PostgreSQL unique constraints.
ALTER TABLE "xapi_statements"
  ADD CONSTRAINT "xapi_statements_statement_hash_key"
  UNIQUE ("statement_hash");
