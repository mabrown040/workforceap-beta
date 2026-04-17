import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import { buildPageMetadata } from '@/app/seo';
import WioaQualificationClient from '@/components/portal/WioaQualificationClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Check If You Qualify for Free Training',
  description:
    'Answer a few questions to find out if you qualify for free, federally funded job training through WorkforceAP. Takes about 2 minutes.',
  path: '/wioa-qualification',
});

export default function PublicWioaQualificationPage() {
  return (
    <>
      <WioaQualificationClient initialSnapshot={null} mode="public" />
      <Footer />
    </>
  );
}
