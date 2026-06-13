import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import PublicInterestProfilerClient from '@/components/public/PublicInterestProfilerClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'O*NET Interest Profiler — Free Career Quiz',
    description:
      'Rate 30 activities and discover your RIASEC interest profile. See how your interests line up with WorkforceAP programs — no account required.',
    path: '/interest-profiler',
  });
}

export default function PublicInterestProfilerPage() {
  return (
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(var(--nav-height-default, 80px) + 1.5rem) 1rem 3rem' }}>
        <PublicInterestProfilerClient />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
