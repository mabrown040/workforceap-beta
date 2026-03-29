import Link from 'next/link';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';
import ApplyConfirmationCta from '@/components/apply/ApplyConfirmationCta';

export const metadata = buildPageMetadata({
  title: 'Application Received',
  description: 'Your application has been submitted successfully.',
  path: '/apply/confirmation',
});

export default function ApplyConfirmationPage() {
  return (
    <StitchPage>
      <StitchHero
        badge="Application Received"
        title={
          <>
            You’re in.
            <br />
            <span className="stitch-title-highlight">We’ll take it from here.</span>
          </>
        }
        description="Confirmation now matches the rest of the public Stitch shell rather than rendering as a disconnected utility page."
      />

      <section className="stitch-section">
        <div className="stitch-grid-2">
          <div className="stitch-surface">
            <Suspense fallback={null}>
              <ApplyConfirmationCta />
            </Suspense>
            <div className="stitch-panel-list wa-mt-6">
              {[
                ['1', 'Email confirmation', 'Check your inbox for your confirmation email and summary of next steps.'],
                ['2', 'Overview session', 'A counselor will contact you within 2–3 business days to schedule a short call.'],
                ['3', 'Assessment and enrollment', 'Complete a brief assessment, then get matched to the right program.'],
              ].map(([step, title, desc]) => (
                <div key={step} className="wa-flex wa-gap-4 wa-items-start">
                  <div className="stitch-step-number">{step}</div>
                  <div>
                    <strong className="wa-block">{title}</strong>
                    <p className="wa-mt-2">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="stitch-cta-band">
            <div className="stitch-kicker">Questions</div>
            <h2>Need help before we reach out?</h2>
            <p>
              Call <a href="tel:+15127771808">(512) 777-1808</a> or email <a href="mailto:info@workforceap.org">info@workforceap.org</a>.
            </p>
            <div className="stitch-actions">
              <Link href="/programs" className="btn btn-primary">Explore programs while you wait</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
