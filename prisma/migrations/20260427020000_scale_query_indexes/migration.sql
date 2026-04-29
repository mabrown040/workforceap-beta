-- Scale-readiness indexes for hot query columns.
-- All use IF NOT EXISTS so re-running is safe.

-- User.createdAt: ORDER BY createdAt DESC in admin member list and CSV export
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users"("created_at");

-- User.deletedAt: WHERE deletedAt IS NULL in every user query
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users"("deleted_at");

-- User.email: WHERE email = ? in auth and dedup lookups
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");

-- CounselorAssignment composite: WHERE memberId AND active = true
CREATE INDEX IF NOT EXISTS "counselor_assignments_member_id_active_idx" ON "counselor_assignments"("member_id", "active");

-- CounselorAssignment composite: WHERE counselorId AND active = true
CREATE INDEX IF NOT EXISTS "counselor_assignments_counselor_id_active_idx" ON "counselor_assignments"("counselor_id", "active");

-- PartnerReferral.memberId: WHERE memberId in admin member detail lookups
CREATE INDEX IF NOT EXISTS "partner_referrals_member_id_idx" ON "partner_referrals"("member_id");
