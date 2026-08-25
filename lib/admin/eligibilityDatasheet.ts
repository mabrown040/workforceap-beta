/**
 * Eligibility datasheet helpers — CSV columns + campaign recipient query.
 * WS5: in-admin table + CSV (no Google Sheet sync). Soft Sept 14 reminder only.
 */

import type { Prisma } from '@prisma/client';
import { MEMBER_ONLY_WHERE } from '@/lib/admin/memberOnlyWhere';
import { excludeChsPartnerReferralsWhere } from '@/lib/partners/chsPartner';
import {
  ELIGIBILITY_DATASHEET_COLUMNS,
  eligibilityDatasheetCells,
  type EligibilityScreeningFields,
} from '@/lib/apply/eligibilityScreeningFields';
import { csvDate } from '@/lib/csv';

/** Soft reminder deadline for the non-CHS eligibility campaign (ops copy only). */
export const ELIGIBILITY_SOFT_DEADLINE_LABEL = 'September 14';

export const ELIGIBILITY_EXPORT_BASE_COLUMNS = [
  'Full Name',
  'Email',
  'Phone',
  'Partner',
  'Signup Date',
  'Screening Submitted',
  ...ELIGIBILITY_DATASHEET_COLUMNS,
] as const;

export type EligibilityExportRow = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  partnerName: string | null;
  screening: (EligibilityScreeningFields & { createdAt?: Date | null }) | null;
};

export function buildEligibilityExportCsvRows(rows: EligibilityExportRow[]): (string | number)[][] {
  return rows.map((r) => [
    r.fullName ?? '',
    r.email ?? '',
    r.phone ?? '',
    r.partnerName ?? '',
    csvDate(r.createdAt),
    csvDate(r.screening?.createdAt ?? null),
    ...eligibilityDatasheetCells(r.screening),
  ]);
}

/**
 * Recipients for the non-CHS Sept 14 soft-reminder eligibility campaign.
 * Excludes Concordia High School referrals via {@link excludeChsPartnerReferralsWhere}.
 * Does NOT disable accounts for non-response — reminder email only.
 */
export function buildEligibilityCampaignWhere(opts?: {
  /** When true (default), only members without an ApplyEligibilityScreening row. */
  missingScreeningOnly?: boolean;
}): Prisma.UserWhereInput {
  const missingScreeningOnly = opts?.missingScreeningOnly !== false;
  const and: Prisma.UserWhereInput[] = [
    MEMBER_ONLY_WHERE,
    excludeChsPartnerReferralsWhere(),
    { deletedAt: null },
    { email: { not: null } },
  ];
  if (missingScreeningOnly) {
    and.push({ applyEligibilityScreenings: { none: {} } });
  }
  return { AND: and };
}

export const eligibilityCampaignSelect = {
  id: true,
  email: true,
  fullName: true,
  organizationId: true,
} satisfies Prisma.UserSelect;

export type EligibilityCampaignMember = Prisma.UserGetPayload<{
  select: typeof eligibilityCampaignSelect;
}>;
