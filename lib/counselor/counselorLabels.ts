/** Display label for counselor affiliation (partner org vs WorkforceAP staff). */
export function counselorAffiliationLabel(partnerName: string | null | undefined): string {
  return partnerName?.trim() ? partnerName : 'WorkforceAP';
}
