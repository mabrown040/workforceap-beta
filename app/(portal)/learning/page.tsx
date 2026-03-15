import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { PATHWAYS } from '@/lib/content/learningPathways';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import LearningPathCard from '@/components/portal/LearningPathCard';

export const metadata: Metadata = buildPageMetadata({
  title: 'Learning Pathways',
  description: 'Recommended learning pathways and progress tracking.',
  path: '/learning',
});

export default async function LearningPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/learning');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Learning Pathways</h1>
            <p>Recommended pathways based on your goals. Track your progress as you complete each step.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/dashboard" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}>
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="learning-pathways-grid">
            {PATHWAYS.map((pathway) => (
              <LearningPathCard key={pathway.id} pathway={pathway} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
