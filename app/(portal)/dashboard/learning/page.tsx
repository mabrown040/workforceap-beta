import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookOpen, ChevronRight, FolderOpen } from 'lucide-react';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { PATHWAYS } from '@/lib/content/learningPathways';
import LearningPathCard from '@/components/portal/LearningPathCard';

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

      <section className="content-section learning-hub-section">
        <div className="container">
          <h2 className="learning-hub-section-title">Where do you want to go?</h2>
          <p className="learning-hub-section-lead">
            Two areas work together: a browsable library for every stage of your search, and a program page with AI tools,
            external guides, and curriculum-aligned links.
          </p>
          <ul className="learning-hub-destinations" role="list">
            <li>
              <Link href="/resources" className="learning-hub-card">
                <span className="learning-hub-card-icon" aria-hidden>
                  <BookOpen size={26} strokeWidth={1.75} />
                </span>
                <span className="learning-hub-card-body">
                  <span className="learning-hub-card-title">Career resource library</span>
                  <span className="learning-hub-card-desc">
                    Filter by topic and stage. Save progress on WorkforceAP materials as you go.
                  </span>
                </span>
                <ChevronRight className="learning-hub-card-chevron" aria-hidden size={22} />
              </Link>
            </li>
            <li>
              <Link href="/dashboard/resources" className="learning-hub-card">
                <span className="learning-hub-card-icon" aria-hidden>
                  <FolderOpen size={26} strokeWidth={1.75} />
                </span>
                <span className="learning-hub-card-body">
                  <span className="learning-hub-card-title">Program resources &amp; AI tools</span>
                  <span className="learning-hub-card-desc">
                    Suggested AI tools, career tips, program-category links, and support contacts for your track.
                  </span>
                </span>
                <ChevronRight className="learning-hub-card-chevron" aria-hidden size={22} />
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <h2 className="learning-hub-section-title learning-hub-section-title--pathways">Structured pathways</h2>
          <p className="learning-hub-section-lead">Step-by-step tracks toward job-ready skills. Your progress syncs as you complete steps.</p>
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
