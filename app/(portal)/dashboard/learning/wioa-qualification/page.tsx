import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import WioaQualificationClient from '@/components/portal/WioaQualificationClient';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalRouteFallback from '@/components/portal/PortalRouteFallback';
import { parseWioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';

export const metadata: Metadata = buildPageMetadata({
  title: 'WIOA screening',
  description: 'Self-screening for WIOA-funded services — prepare for staff and American Job Center visits.',
  path: '/dashboard/learning/wioa-qualification',
});

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
      (error instanceof Prisma.PrismaClientKnownRequestError ||
        error instanceof Prisma.PrismaClientUnknownRequestError) &&
      (/column .*wioa_qualification_json.* does not exist/i.test(message) ||
        /wioa_qualification_json/i.test(message));

    if (looksLikeSchemaDrift) {
      return (
        <>
          <PortalRouteFallback
            title="WIOA screening is temporarily unavailable"
            description="We could not load your saved WIOA screening answers right now. You can keep using the rest of the portal and try this page again shortly."
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
