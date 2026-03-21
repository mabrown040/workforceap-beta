import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { PATHWAYS } from '@/lib/content/learningPathways';
import LearningPathCard from '@/components/portal/LearningPathCard';
import LearningHubDestinationCards from '@/components/portal/LearningHubDestinationCards';

export const metadata: Metadata = buildPageMetadata({
  title: 'Learning hub',
  description:
    'Learning pathways, the career resource library, and program-specific tools — organized in one place.',
  path: '/dashboard/learning',
});

export default async function LearningPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/learning');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Learning hub</h1>
          <p>
            Your pathways, searchable career resources, and program-specific tools — organized so you always know where
            to look next.
          </p>
        </div>
      </section>

      <LearningHubDestinationCards />

      <section className="content-section">
        <div className="container">
          <h2 className="learning-hub-section-title learning-hub-section-title--pathways">Structured pathways</h2>
          <p className="learning-hub-section-lead">
            Step-by-step tracks toward job-ready skills. Your progress syncs as you complete steps.
          </p>
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
