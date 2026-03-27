import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import FindYourPathClient from './FindYourPathClient';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';

export const metadata: Metadata = buildPageMetadata({
  title: 'Find Your Path — Career Quiz',
  description:
    'Take our 2-minute quiz to discover which WorkforceAP program best fits your interests, experience, and goals. No-cost training for members.',
  path: '/find-your-path',
});

export default function FindYourPathPage() {
  return (
    <div className="inner-page">
      <section className="page-hero find-your-path-hero">
        <div className="page-hero-content">
          <h1>Find Your Path</h1>
          <p>
            Five questions, three ranked matches, plain-English why — tied to the same salary bands and program pages you will see
            elsewhere. If computers feel intimidating, we prioritize the Digital Literacy track first so you build confidence before heavier tech programs. Austin is where we are proving this first.
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <ExperimentedCtaLink
              experiment="find_path_apply_cta"
              variants={[
                { id: 'control', label: 'Ready now? Start your application', className: 'btn btn-primary', href: '/apply' },
                { id: 'urgency', label: 'Apply now (10 minutes)', className: 'btn btn-primary', href: '/apply' },
              ]}
            />
          </div>
          <FindYourPathClient />
        </div>
      </section>

      <Footer />
    </div>
  );
}
