import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import ApplyMobileStepNav from '@/components/apply/ApplyMobileStepNav';
import ApplyMobileTrustBar from '@/components/apply/ApplyMobileTrustBar';
import PaidApplyProofBlock from '@/components/apply/PaidApplyProofBlock';
import TrustStrip from '@/components/marketing/TrustStrip';
import OrganicApplyPage from './OrganicApplyPage';
import PaidApplyVariant from './PaidApplyVariant';
import SchoolApplyVariant from './SchoolApplyVariant';
import { buildApplyPageMetadata } from '@/lib/apply/applyProgramPage';
import { PARTNER_REF_COOKIE } from '@/lib/apply/applyReferralCapture';
import {
  resolveApplyPartnerRef,
  resolveSchoolApplyPartner,
} from '@/lib/apply/schoolApplyPartner';
import {
  resolvePaidApplyUtmSource,
  UTM_SOURCE_COOKIE,
} from '@/lib/apply/paidApplyUtm';

type PageProps = {
  searchParams?: Promise<{ program?: string; utm_source?: string; ref?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = searchParams ? await searchParams : {};
  return await buildApplyPageMetadata(sp.program);
}

export default async function ApplyPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const cookieUtm = cookieStore.get(UTM_SOURCE_COOKIE)?.value ?? null;

  // School-partner variant (Phase B4), checked FIRST: a student who arrived
  // through a high school must get school-appropriate questions even if the
  // school also runs paid ads, and `partnerType` on the resolved row — never
  // a query param — is what decides it.
  //
  // The ref comes from `?ref=` or the durable partner-attribution cookie
  // planted by middleware on `/enroll/<slug>`. With neither present this runs
  // no query at all, so organic and paid traffic is untouched.
  const partnerRef = resolveApplyPartnerRef(
    sp.ref,
    cookieStore.get(PARTNER_REF_COOKIE)?.value
  );
  const schoolPartner = await resolveSchoolApplyPartner(partnerRef);
  if (schoolPartner) {
    return (
      <SchoolApplyVariant
        schoolPartner={{
          name: schoolPartner.name,
          slug: schoolPartner.slug,
          schoolDistrict: schoolPartner.schoolDistrict,
        }}
        // Whether the page may claim the seat is sponsored. Resolved from the
        // partner's sponsorship window and seat cap, never from `partnerType`
        // alone: a school outside its funded term still gets the school
        // QUESTIONS, and must not get the sponsored-seat COPY.
        sponsorshipInForce={schoolPartner.sponsorshipInForce}
        program={sp.program}
        stepNav={<ApplyMobileStepNav activeStep={0} showTimeHint />}
        trustStrip={<TrustStrip variant="apply" />}
      />
    );
  }

  const paidUtmSource = resolvePaidApplyUtmSource(sp, cookieUtm);

  if (paidUtmSource) {
    return (
      <PaidApplyVariant
        utmSource={paidUtmSource}
        program={sp.program}
        stepNav={<ApplyMobileStepNav activeStep={0} showTimeHint />}
        mobileTrustBar={<ApplyMobileTrustBar />}
        proofBlock={<PaidApplyProofBlock />}
        trustStrip={<TrustStrip variant="apply" />}
      />
    );
  }

  return <OrganicApplyPage program={sp.program} />;
}
