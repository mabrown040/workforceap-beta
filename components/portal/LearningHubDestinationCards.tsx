'use client';

import Link from 'next/link';
import { BookOpen, ChevronRight, FolderOpen } from 'lucide-react';
import { trackLearningHubNavigate } from '@/lib/analytics/events';

export default function LearningHubDestinationCards() {
  return (
    <section className="content-section learning-hub-section">
      <div className="container">
        <h2 className="learning-hub-section-title">Where do you want to go?</h2>
        <p className="learning-hub-section-lead">
          Two areas work together: a browsable library for every stage of your search, and a program page with AI tools,
          external guides, and curriculum-aligned links.
        </p>
        <ul className="learning-hub-destinations" role="list">
          <li>
            <Link
              href="/resources"
              className="learning-hub-card"
              onClick={() => trackLearningHubNavigate('career_library')}
            >
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
            <Link
              href="/dashboard/resources"
              className="learning-hub-card"
              onClick={() => trackLearningHubNavigate('program_resources')}
            >
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
  );
}
