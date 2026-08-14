import { prisma } from '@/lib/db/prisma';
import {
  isSchoolApplyVariant,
  normalizePartnerRef,
  type SponsorshipPartner,
} from '@/lib/partner/sponsoredEnrollment';

export type SchoolApplyContext = {
  partnerId: string;
  partnerName: string;
  schoolName: string;
  referralCode: string;
};

const SELECT = {
  id: true,
  name: true,
  slug: true,
  referralCode: true,
  partnerType: true,
  sponsoredEnrollment: true,
  sponsorshipFundingSource: true,
  sponsorshipTermLabel: true,
  sponsorshipStartsAt: true,
  sponsorshipEndsAt: true,
  sponsorshipNotes: true,
} as const;

export async function resolveSchoolApply(
  rawRef: string | null | undefined,
): Promise<SchoolApplyContext | null> {
  const ref = normalizePartnerRef(rawRef);
  if (!ref) return null;
  const partner = await prisma.partner.findFirst({
    where: {
      active: true,
      OR: [{ referralCode: ref }, { slug: ref }],
    },
    select: SELECT,
  });
  if (!partner || !isSchoolApplyVariant(partner as SponsorshipPartner)) return null;
  return {
    partnerId: partner.id,
    partnerName: partner.name,
    schoolName: partner.name,
    referralCode: partner.referralCode ?? ref,
  };
}
