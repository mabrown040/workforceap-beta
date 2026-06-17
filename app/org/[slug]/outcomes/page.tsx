import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { buildPageMetadataAsync } from '@/app/seo';
import OrgOutcomesClient from './OrgOutcomesClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const partner = await prisma.partner.findUnique({
    where: { slug },
    select: { name: true },
  });
  return buildPageMetadataAsync({
    title: partner?.name ? `${partner.name} — Outcomes Report` : 'Partner Outcomes Report',
    description: 'Quarterly outcomes report for partner members',
    path: `/org/${slug}/outcomes`,
  });
}

type Props = { params: Promise<{ slug: string }> };

export default async function OrgOutcomesPage({ params }: Props) {
  const { slug } = await params;
  const partner = await prisma.partner.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, logoUrl: true, brandColor: true },
  });
  if (!partner) notFound();

  return <OrgOutcomesClient partnerId={partner.id} partnerName={partner.name} partnerSlug={partner.slug} partnerLogo={partner.logoUrl} partnerBrandColor={partner.brandColor} />;
}
