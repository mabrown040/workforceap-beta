#!/usr/bin/env npx tsx
/**
 * Create, adopt or repair the Concordia High School partner record.
 *
 * All of the decision logic lives in `lib/partners/chsPartnerProvisioning.ts`
 * so it is unit-tested without a database (`chsPartnerProvisioning.test.ts`
 * covers fresh create, adopt-and-rename, already-correct no-op, and a
 * third-party referral-code conflict). This file owns only the Prisma client,
 * the organization lookup, and the console output.
 *
 * Idempotent and non-clobbering:
 * - Keyed on slug 'concordia' (CHS_PARTNER_SLUG). The slug MUST equal the
 *   `/enroll/<segment>` in the student link — middleware derives the partner
 *   ref straight from that URL segment and the signup route resolves it
 *   against `Partner.slug`. See lib/partners/chsPartner.ts.
 * - ADOPTS the Phase A production row. If there is no 'concordia' partner but
 *   a 'concordia-high-school' one owns referral code 'chs2026', that IS our
 *   row (Phase A's runbook created it at that slug; Phase B2 shortened the
 *   constant) and it is renamed in place. Prints `ADOPTED (renamed ...)`.
 * - If nothing exists, creates it with the full launch facts, including the
 *   sponsorship block that makes the automatic funding stamp fire and
 *   `enrollmentPageEnabled` without which /enroll/concordia 404s.
 * - If it exists, only fills fields that are missing/empty and re-asserts the
 *   launch-critical invariants. Never overwrites non-empty admin-edited
 *   contact/notes/sponsorship fields.
 * - If a partner that is NOT ours owns 'chs2026', prints an actionable error
 *   and changes nothing.
 *
 * SEAT CAP: intentionally left NULL (uncapped). Spend is controlled by the
 * manual Coursera activation gate — an admin flips `courseraEnrollmentApproved`
 * per consented student — so a seat cap here would only add a second, silently
 * failing limiter on top of the real one. See docs/runbooks/CONCORDIA-LAUNCH.md.
 *
 * Run: node scripts/prisma-env.js npx tsx scripts/create-chs-partner.ts
 */

import { PrismaClient } from '@prisma/client';
import { getDefaultOrganizationId } from '../lib/tenant/organization';
import {
  formatChsProvisionResult,
  provisionChsPartner,
  type ChsProvisionDb,
} from '../lib/partners/chsPartnerProvisioning';

const prisma = new PrismaClient();

async function main() {
  const result = await provisionChsPartner({
    // One documented cast at the injection point: the generated client is
    // structurally compatible with (and much wider than) `ChsProvisionDb`, but
    // its overloaded generic signatures don't assign cleanly to a hand-written
    // seam.
    db: prisma as unknown as ChsProvisionDb,
    resolveOrganizationId: getDefaultOrganizationId,
  });

  const line = formatChsProvisionResult(result);
  if (result.kind === 'conflict') {
    console.error(line);
    process.exitCode = 1;
    return;
  }
  console.log(line);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
