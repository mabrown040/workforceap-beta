import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Footer from '@/components/Footer';
import { buildPageMetadataAsync } from '@/app/seo';

const WioaQualificationClient = dynamic(() => import('@/components/portal/WioaQualificationClient'), {
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '40vh',
        padding: '2.5rem 1.25rem',
        textAlign: 'center',
        color: 'var(--color-on-surface-variant)',
        fontSize: '0.9rem',
        fontWeight: 600,
      }}
    >
      Loading assessment…
    </div>
  ),
});

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
