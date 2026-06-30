-- The apply-flow eligibility screening's third question (q3) is optional:
-- the Prisma schema already declares it `q3 String?`, but production still
-- carries the original NOT NULL constraint. When a signup omits q3, the
-- insert fails with "Null constraint violation on the fields: (q3)" and the
-- whole account-setup transaction rolls back (Sentry JAVASCRIPT-NEXTJS-1A).
-- Drop the constraint so the column matches the schema's intent.
ALTER TABLE "apply_eligibility_screenings"
  ALTER COLUMN "q3" DROP NOT NULL;
