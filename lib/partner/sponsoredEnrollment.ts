import type { FundingSource } from '@prisma/client';

/** Cookie that survives the apply funnel when sessionStorage is cleared or a new tab is opened. */
export const APPLY_REFERRAL_COOKIE = 'wap_partner_ref';

/** 30 days — same window as the paid-apply UTM cookie. */
export const APPLY_REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const REF_PATTERN = /^[a-z0-9][a-z0-9-]{0,99}$/;

export type SponsorshipPartner = {
  id: string;
  name: string;
  slug: string;
  referralCode: string | null;
  partnerType: string;
  sponsoredEnrollment: boolean;
  sponsorshipFundingSource: FundingSource | null;
  sponsorshipTermLabel: string | null;
  sponsorshipStartsAt: Date | null;
  sponsorshipEndsAt: Date | null;
  sponsorshipNotes: string | null;
};

export type SponsorshipStamp = {
  fundingSource: FundingSource;
  fundingNotes: string;
  sponsoredByPartnerId: string;
};

/** Normalize a `?ref=` / cookie / body value. Returns null if empty or malformed. */
export function normalizePartnerRef(raw: string | null | undefined): string | null {
  const value = raw?.trim().toLowerCase() ?? '';
  if (!value || !REF_PATTERN.test(value)) return null;
  return value;
}

export function isSponsorshipWindowOpen(
  partner: Pick<SponsorshipPartner, 'sponsorshipStartsAt' | 'sponsorshipEndsAt'>,
  now: Date = new Date(),
): boolean {
  if (partner.sponsorshipStartsAt && now < partner.sponsorshipStartsAt) return false;
  if (partner.sponsorshipEndsAt && now > partner.sponsorshipEndsAt) return false;
  return true;
}

/**
 * A partner covers the seat when sponsored enrollment is on and the term
 * window (if set) includes `now`. Date-less rows are treated as open-ended.
 */
export function isActiveSponsorship(
  partner: Pick<
    SponsorshipPartner,
    'sponsoredEnrollment' | 'sponsorshipStartsAt' | 'sponsorshipEndsAt'
  > | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!partner?.sponsoredEnrollment) return false;
  return isSponsorshipWindowOpen(partner, now);
}

/** School apply variant: hide income questions, capture grade + guardian. */
export function isSchoolApplyVariant(
  partner: Pick<SponsorshipPartner, 'partnerType' | 'sponsoredEnrollment'> | null | undefined,
): boolean {
  if (!partner) return false;
  return partner.sponsoredEnrollment === true || partner.partnerType === 'high_school';
}

export function buildSponsorshipStamp(
  partner: Pick<
    SponsorshipPartner,
    'id' | 'name' | 'sponsorshipFundingSource' | 'sponsorshipTermLabel' | 'sponsorshipNotes'
  >,
): SponsorshipStamp {
  const term = partner.sponsorshipTermLabel?.trim() || new Date().getUTCFullYear().toString();
  const notes =
    partner.sponsorshipNotes?.trim() || `Sponsored by ${partner.name} (${term})`;
  return {
    fundingSource: partner.sponsorshipFundingSource ?? 'PARTNER_ORG',
    fundingNotes: notes,
    sponsoredByPartnerId: partner.id,
  };
}

export function readReferralCookieFromHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${APPLY_REFERRAL_COOKIE}=([^;]+)`));
  if (!match?.[1]) return null;
  try {
    return normalizePartnerRef(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function readReferralCookieFromDocument(): string | null {
  if (typeof document === 'undefined') return null;
  return readReferralCookieFromHeader(document.cookie);
}

export function writeReferralCookieOnDocument(ref: string): void {
  if (typeof document === 'undefined') return;
  const normalized = normalizePartnerRef(ref);
  if (!normalized) return;
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${APPLY_REFERRAL_COOKIE}=${encodeURIComponent(normalized)}; Path=/; Max-Age=${APPLY_REFERRAL_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

export function referralCookieSetOptions(ref: string): {
  name: string;
  value: string;
  path: '/';
  maxAge: number;
  sameSite: 'lax';
} | null {
  const normalized = normalizePartnerRef(ref);
  if (!normalized) return null;
  return {
    name: APPLY_REFERRAL_COOKIE,
    value: normalized,
    path: '/',
    maxAge: APPLY_REFERRAL_COOKIE_MAX_AGE,
    sameSite: 'lax',
  };
}
