import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import ApplyMobileStepNav from '@/components/apply/ApplyMobileStepNav';
import ApplyMobileTrustBar from '@/components/apply/ApplyMobileTrustBar';
import PaidApplyProofBlock from '@/components/apply/PaidApplyProofBlock';
import TrustStrip from '@/components/marketing/TrustStrip';
import OrganicApplyPage from './OrganicApplyPage';
import PaidApplyVariant from './PaidApplyVariant';
import { buildApplyPageMetadata } from '@/lib/apply/applyProgramPage';
import {
  resolvePaidApplyUtmSource,
  UTM_SOURCE_COOKIE,
} from '@/lib/apply/paidApplyUtm';
import { partnerRefForApplyLanding } from '@/lib/apply/applyReferralCapture';
import { resolveSchoolApply } from '@/lib/apply/resolveSchoolApply';

type PageProps = { searchParams?: Promise<{ program?: string; utm_source?: string; ref?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = searchParams ? await searchParams : {};
  return await buildApplyPageMetadata(sp.program);
}

export default async function ApplyPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const cookieUtm = cookieStore.get(UTM_SOURCE_COOKIE)?.value ?? null;
  // Explicit ?ref= only — sticky enroll cookies must not force school mode here.
  const schoolApply = await resolveSchoolApply(partnerRefForApplyLanding(sp.ref));

  const paidUtmSource = resolvePaidApplyUtmSource(sp, cookieUtm);

  if (paidUtmSource && !schoolApply) {
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

  return <OrganicApplyPage program={sp.program} schoolApply={schoolApply} />;
}
