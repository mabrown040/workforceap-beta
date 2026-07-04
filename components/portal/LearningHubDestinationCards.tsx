'use client';

import Link from 'next/link';
import { BookOpen, ChevronRight, FolderOpen, ShieldCheck } from 'lucide-react';
import { trackLearningHubNavigate } from '@/lib/analytics/events';

const WIOA_AVAILABLE = process.env.NEXT_PUBLIC_WIOA_ENABLED === '1';

export default function LearningHubDestinationCards() {
  return (
    <section className="content-section learning-hub-section">
      <div className="container">
        <h2 className="learning-hub-section-title">Where do you want to go?</h2>
        <p className="learning-hub-section-lead">
          Two areas work together: a browsable library for every stage of your search, and a program page with AI tools,
          external guides, and curriculum-aligned links.
        </p>
        <ul className="learning-hub-destinations">
          <li>
            <Link
              href="/dashboard/career-library"
              className="learning-hub-card"
              style={{ background: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}
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
              style={{ background: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}
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
          {WIOA_AVAILABLE ? (
            <li>
              <Link
                href="/dashboard/learning/wioa-qualification"
                className="learning-hub-card"
                style={{ background: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}
                onClick={() => trackLearningHubNavigate('wioa_screening')}
              >
                <span className="learning-hub-card-icon" aria-hidden>
                  <ShieldCheck size={26} strokeWidth={1.75} />
                </span>
                <span className="learning-hub-card-body">
                  <span className="learning-hub-card-title">Funding eligibility check</span>
                  <span className="learning-hub-card-desc">
                    Quick self-screening to see if you qualify for funded training through a government workforce program.
                  </span>
                </span>
                <ChevronRight className="learning-hub-card-chevron" aria-hidden size={22} />
              </Link>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
