import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import WioaQualificationClient from '@/components/portal/WioaQualificationClient';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalRouteFallback from '@/components/portal/PortalRouteFallback';
import { parseWioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Training Funding Eligibility Check',
  description: 'Answer a few questions to help your counselor identify which no-cost training services may be available to you.',
  path: '/dashboard/learning/wioa-qualification',
});
}

export default async function WioaQualificationPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/learning/wioa-qualification');

  let initial = null;
  try {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { wioaQualificationJson: true },
    });
    initial = parseWioaQualificationSnapshot(row?.wioaQualificationJson);
  } catch (error) {
    console.error('[member/wioa-qualification] failed to load qualification snapshot', error);
    const message = error instanceof Error ? error.message : String(error ?? '');
    const looksLikeSchemaDrift =
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      /column .*wioa_qualification_json.* does not exist/i.test(message) ||
      /wioa_qualification_json/i.test(message);

    if (looksLikeSchemaDrift) {
      return (
        <>
          <PortalRouteFallback
            title="WIOA screening is not enabled yet"
            description="This WorkforceAP environment does not have WIOA screening storage enabled yet. If you need WIOA guidance right now, message your counselor and we'll help you with the next steps."
          />
          <MobileBottomNav variant="portal" />
        </>
      );
    }
    throw error;
  }

  return (
    <>
      <WioaQualificationClient initialSnapshot={initial} />
      <MobileBottomNav variant="portal" />
    </>
  );
}
