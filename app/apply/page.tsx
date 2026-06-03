import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import ApplyMobileStepNav from '@/components/apply/ApplyMobileStepNav';
import PaidApplyProofBlock from '@/components/apply/PaidApplyProofBlock';
import TrustStrip from '@/components/marketing/TrustStrip';
import OrganicApplyPage from './OrganicApplyPage';
import PaidApplyVariant from './PaidApplyVariant';
import { buildApplyPageMetadata } from '@/lib/apply/applyProgramPage';
import {
  resolvePaidApplyUtmSource,
  UTM_SOURCE_COOKIE,
} from '@/lib/apply/paidApplyUtm';

type PageProps = { searchParams?: Promise<{ program?: string; utm_source?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = searchParams ? await searchParams : {};
  return await buildApplyPageMetadata(sp.program);
}

export default async function ApplyPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const cookieUtm = cookieStore.get(UTM_SOURCE_COOKIE)?.value ?? null;

  const paidUtmSource = resolvePaidApplyUtmSource(sp, cookieUtm);

  if (paidUtmSource) {
    return (
      <PaidApplyVariant
        utmSource={paidUtmSource}
        program={sp.program}
        stepNav={<ApplyMobileStepNav activeStep={0} />}
        proofBlock={<PaidApplyProofBlock />}
        trustStrip={<TrustStrip variant="apply" />}
      />
    );
  }

  return <OrganicApplyPage program={sp.program} />;
}
