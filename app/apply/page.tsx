import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import OrganicApplyPage from './OrganicApplyPage';
import PaidApplyVariant from './PaidApplyVariant';
import { buildApplyPageMetadata } from '@/lib/apply/applyProgramPage';
import {
  isPaidUtmSource,
  persistUtmSourceCookie,
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

  if (sp.utm_source && isPaidUtmSource(sp.utm_source)) {
    await persistUtmSourceCookie(sp.utm_source);
  }

  const paidUtmSource = resolvePaidApplyUtmSource(sp, cookieUtm);

  if (paidUtmSource) {
    return <PaidApplyVariant utmSource={paidUtmSource} program={sp.program} />;
  }

  return <OrganicApplyPage program={sp.program} />;
}
