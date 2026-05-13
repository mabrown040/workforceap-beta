#!/usr/bin/env node
/**
 * CI guardrail: ensures high-risk tenant-boundary routes keep explicit org scoping.
 * See docs/TENANT-ISOLATION.md — "High-risk route checklist".
 *
 * Usage: node scripts/verify-high-risk-tenant-routes.cjs
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function fail(msg) {
  console.error(`[verify-high-risk-tenant-routes] ${msg}`);
  process.exit(1);
}

/** @param {string} rel @param {string[]} needles */
function assertContains(rel, needles, label) {
  const src = read(rel);
  for (const n of needles) {
    if (!src.includes(n)) {
      fail(`${rel} missing required fragment for ${label}: expected "${n}"`);
    }
  }
}

assertContains(
  'app/api/admin/members/route.ts',
  ['getActorOrganizationId', 'withTenantScope'],
  'admin members list',
);

assertContains(
  'app/api/admin/metrics/route.ts',
  ["getActorOrganizationId(user.id)", "['admin-api-metrics-v1', orgId]", 'computeAdminRouteMetricsPayload'],
  'admin metrics API (per-org cache + scoped compute)',
);

assertContains(
  'lib/admin/metrics.ts',
  ['export async function getAdminMetrics(orgId: string)', 'memberInOrg'],
  'scoped getAdminMetrics',
);

assertContains(
  'app/api/counselor/inactive-members/route.ts',
  ['getActorOrganizationId', 'u.organization_id'],
  'counselor inactive roster SQL',
);

assertContains(
  'app/api/employer/jobs/route.ts',
  ['withTenantScope', 'employerScope.organizationId'],
  'employer job list',
);

assertContains(
  'app/api/partner/referral-members/route.ts',
  ['loadPartnerReferralBundle(ctx.partnerId, ctx.partner.organizationId)'],
  'partner referral members',
);

assertContains(
  'lib/partner/referralBundle.ts',
  ['tenantOrganizationId', 'partner: { organizationId: tenantOrganizationId }'],
  'referral bundle tenant filter',
);

assertContains(
  'lib/auth/roles.ts',
  ['organizationId: true', 'PARTNER_BRANDING_SELECT'],
  'partner context carries organizationId',
);

console.log('[verify-high-risk-tenant-routes] OK');
