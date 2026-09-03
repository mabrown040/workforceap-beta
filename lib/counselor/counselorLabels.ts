/** Display label for counselor affiliation (partner org vs WorkforceAP staff). */
export function counselorAffiliationLabel(partnerName: string | null | undefined): string {
  return partnerName?.trim() ? partnerName : 'WorkforceAP';
}

/**
 * Affiliation label that also knows the non-partner kinds (independent
 * advisors, Community Ambassadors — 9/2/26).
 */
export function counselorAffiliationDisplay(
  affiliation: string | null | undefined,
  partnerName: string | null | undefined,
): string {
  if (affiliation === 'community_ambassador') return 'Community Ambassador';
  if (affiliation === 'independent') return 'Independent advisor';
  return counselorAffiliationLabel(partnerName);
}
