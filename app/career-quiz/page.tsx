import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import PublicCareerQuizClient from '@/components/public/PublicCareerQuizClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Free Career Quiz — Find Careers That Fit You',
    description:
      'Answer 6 quick questions and see careers and free WorkforceAP training that fit your interests. No account required.',
    path: '/career-quiz',
  });
}

export default function PublicCareerQuizPage() {
  return (
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(var(--nav-height-default, 80px) + 1.5rem) 1rem 3rem' }}>
        <PublicCareerQuizClient />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
