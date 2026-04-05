import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import WioaQualificationClient from '@/components/portal/WioaQualificationClient';
import MobileBottomNav from '@/components/MobileBottomNav';
import type { WioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';

export const metadata: Metadata = buildPageMetadata({
  title: 'WIOA screening',
  description: 'Self-screening for WIOA-funded services — prepare for staff and American Job Center visits.',
  path: '/dashboard/learning/wioa-qualification',
});

function parseSnapshot(raw: unknown): WioaQualificationSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || typeof o.submittedAt !== 'string' || typeof o.signal !== 'string') return null;
  return o as unknown as WioaQualificationSnapshot;
}

export default async function WioaQualificationPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/learning/wioa-qualification');

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { wioaQualificationJson: true },
  });

  const initial = parseSnapshot(row?.wioaQualificationJson);

  return (
    <>
      <WioaQualificationClient initialSnapshot={initial} />
      <MobileBottomNav variant="portal" />
    </>
  );
}
