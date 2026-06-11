import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import PlacementsTableClient from '@/components/admin/PlacementsTableClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Placements',
    description: 'Every recorded job placement — employer, role, wage, and verification status.',
    path: '/admin/placements',
  });
}

const placementListSelect = {
  id: true,
  employerName: true,
  jobTitle: true,
  startDate: true,
  startDateVerified: true,
  salaryOffered: true,
  placedAt: true,
  user: {
    select: { id: true, fullName: true, email: true, enrolledProgram: true },
  },
} satisfies Prisma.PlacementRecordSelect;

type PlacementRow = Prisma.PlacementRecordGetPayload<{ select: typeof placementListSelect }>;

export default async function AdminPlacementsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/placements');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const placements: PlacementRow[] = await prisma.placementRecord.findMany({
    orderBy: { placedAt: 'desc' },
    take: 500,
    select: placementListSelect,
  });

  const pendingCount = placements.filter((p) => !p.startDateVerified).length;

  return (
    <PortalPageFrame>
      <PageHeader
        title="Placements"
        subtitle={`${placements.length.toLocaleString()} recorded placements — ${pendingCount.toLocaleString()} awaiting start-date verification.`}
        action={
          <Link href="/admin/placements/new" className="btn btn-outline">
            Record placement
          </Link>
        }
      />

      <PlacementsTableClient placements={placements} />
    </PortalPageFrame>
  );
}
