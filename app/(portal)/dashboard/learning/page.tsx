import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { PATHWAYS } from '@/lib/content/learningPathways';
import LearningPathCard from '@/components/portal/LearningPathCard';

export const metadata: Metadata = buildPageMetadata({
  title: 'Learning Pathways',
  description: 'Recommended learning pathways and progress tracking.',
  path: '/dashboard/learning',
});

export default async function LearningPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/learning');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Learning Pathways</h1>
          <p>Recommended pathways based on your goals. Track your progress as you complete each step.</p>
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

    </div>
  );
}
