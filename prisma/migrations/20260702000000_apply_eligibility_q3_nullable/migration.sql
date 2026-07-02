-- The apply flow's eligibility screener only asks q1/q2 today, but the table
-- was created with q3 NOT NULL. Every signup that completed the screener hit
-- "Null constraint violation on the fields: (q3)", rolled back the whole
-- signup transaction, and deleted the just-created auth user
-- (Sentry JAVASCRIPT-NEXTJS-1A). Align the column with prisma/schema.prisma,
-- which already declares `q3 String?`.
ALTER TABLE apply_eligibility_screenings ALTER COLUMN q3 DROP NOT NULL;
