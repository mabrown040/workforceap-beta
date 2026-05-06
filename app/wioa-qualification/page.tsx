import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import { buildPageMetadataAsync } from '@/app/seo';
import WioaQualificationClient from '@/components/portal/WioaQualificationClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'WIOA Qualification Assessment',
  description:
    'See whether WIOA-funded training may be a fit. Complete a quick public qualification assessment and WorkforceAP can follow up with next steps.',
  path: '/wioa-qualification',
});
}

export default function PublicWioaQualificationPage() {
  return (
    <>
      <WioaQualificationClient initialSnapshot={null} mode="public" />
      <Footer />
    </>
  );
}
