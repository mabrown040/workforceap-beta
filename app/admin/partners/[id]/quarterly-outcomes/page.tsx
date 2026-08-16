import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { buildPageMetadataAsync } from '@/app/seo';
import PartnerQuarterlyOutcomesClient from './PartnerQuarterlyOutcomesClient';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const partner = await prisma.partner.findUnique({
    where: { id },
    select: { name: true },
  });
  return buildPageMetadataAsync({
    title: partner?.name ? `${partner.name} — Quarterly Outcomes` : 'Partner Quarterly Outcomes',
    description: 'Partner cohort outcomes report for funder submissions',
    path: `/admin/partners/${id}/quarterly-outcomes`,
  });
}

type Props = { params: Promise<{ id: string }> };

export default async function PartnerQuarterlyOutcomesPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/partners');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const { id } = await params;
  const orgId = await getActorOrganizationId(user.id);
  const partner = await withTenantScope(orgId, (db) =>
    db.partner.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    }),
  );
  if (!partner) notFound();

  return <PartnerQuarterlyOutcomesClient partnerId={partner.id} partnerName={partner.name} partnerSlug={partner.slug} />;
}
