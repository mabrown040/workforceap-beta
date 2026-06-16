#!/bin/bash
# vercel-deploy-fix.sh — One-shot fix for failed migration on Vercel production
# Run this in the Vercel CLI or as a one-off function
#
# The build fails because:
#   20260614180000_s2_compliance_guc_nullif_xapi_org
# failed its DO $$ verification block (GUC state mismatch in prod).
# The migration is PARTIALLY applied (functions + trigger created) but
# Prisma marks it as failed, blocking all subsequent migrations.
#
# Fix:
#   1. Force-resolve the failed migration as "applied"
#   2. The new recovery migration (20260616000000) will idempotently ensure
#      all objects are in the correct final state
#   3. Subsequent migrations (20260615000000, 20260615040346, etc.) apply normally

set -e

echo "=== Vercel Migration Recovery ==="
echo ""
echo "Step 1: Force-resolve failed migration 20260614180000_s2_compliance_guc_nullif_xapi_org"
echo "   (Objects are already partially applied; this just clears the lock)"
echo ""

node scripts/safe-migrate.cjs --force-resolve 20260614180000_s2_compliance_guc_nullif_xapi_org

echo ""
echo "Step 2: Run migrate deploy to apply remaining migrations"
echo ""

npx prisma migrate deploy

echo ""
echo "=== Recovery complete ==="
echo "Build should now pass."
