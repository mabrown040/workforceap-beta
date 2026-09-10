/** One attributed URL for the partner overview, guide, and copy tools. */
export function buildPartnerReferralLink(partner: { referralCode?: string | null; slug: string }) {
  const referralCode = partner.referralCode?.trim() || partner.slug;
  const url = new URL('/apply', process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org');
  url.searchParams.set('ref', referralCode);
  return { referralCode, url: url.toString() };
}
