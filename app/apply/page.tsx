import type { Metadata } from 'next';
import { Suspense } from 'react';
import Footer from '@/components/Footer';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';
import ApplyEligibilityClient from './ApplyEligibilityClient';
import ApplyPageSkeleton from './ApplyPageSkeleton';
import ApplyProgramIntro from '@/components/apply/ApplyProgramIntro';
import ApplyRefCapture from '@/components/apply/ApplyRefCapture';
import { buildApplyPageMetadata, getProgramBySlug, resolveApplyProgramSlug } from '@/lib/apply/applyProgramPage';

type PageProps = { searchParams?: Promise<{ program?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = searchParams ? await searchParams : {};
  return buildApplyPageMetadata(sp.program);
}

export default async function ApplyPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const programSlug = resolveApplyProgramSlug(sp.program);
  const program = programSlug ? getProgramBySlug(programSlug) : undefined;

  return (
    <StitchPage>
      <StitchHero
        badge="Application"
        title={
          <>
            Start your application
            <br />
            inside the <span className="stitch-title-highlight">same premium shell</span>
          </>
        }
        description="Apply no longer feels like a disconnected old page. The form and benefits panel now live inside the same Stitch presentation system while all logic stays untouched."
      />

      <section className="stitch-section">
        <div className="stitch-grid-2">
          <div className="stitch-surface">
            <div className="stitch-pill-row wa-mb-6">
              {['Basic Info', 'Background', 'Program Interest'].map((label, index) => (
                <span key={label} className="stitch-pill">
                  {index + 1}. {label}
                </span>
              ))}
            </div>
            {program ? <ApplyProgramIntro programSlug={program.slug} /> : null}
            <Suspense fallback={<div className="stitch-muted">Loading…</div>}>
              <ApplyRefCapture />
            </Suspense>
            <Suspense fallback={<ApplyPageSkeleton />}>
              <ApplyEligibilityClient />
            </Suspense>
          </div>

          <div className="stitch-cta-band">
            <div className="stitch-kicker">Free for Members</div>
            <h2>No-cost training and career support</h2>
            <p>Industry-recognized certifications, counselor support, AI tools, placement help, and flexible learning options stay intact.</p>
            <div className="stitch-panel-list wa-mt-6">
              {[
                'Industry-recognized certifications',
                'Dedicated career counselor',
                'AI-powered resume and job tools',
                'Job placement support',
                'Flexible online or hybrid options',
                'No prior experience required',
              ].map((item) => (
                <div key={item}>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
            <div className="stitch-card stitch-stat-card wa-mt-6">
              <strong>84%</strong>
              <span>of members land jobs within 90 days</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
