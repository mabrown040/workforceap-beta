import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';
import ProgramsGrid from '@/components/programs/ProgramsGrid';
import { PROGRAMS, WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Career Training Programs in Austin, TX',
  description: `Explore ${WORKFORCEAP_PROGRAM_CATALOG_SIZE} free career training programs in Austin, TX.`,
  path: '/programs',
});

export default function ProgramsPage() {
  return (
    <StitchPage>
      <StitchHero
        badge="Program Catalog"
        title={
          <>
            Programs built for
            <br />
            <span className="stitch-title-highlight">real job outcomes</span>
          </>
        }
        description="The catalog now sits inside the same Stitch shell as the rest of marketing: dark default, stronger hero treatment, cleaner surfaces, and tighter CTA rhythm."
        actions={
          <>
            <Link href="/find-your-path" className="btn btn-primary">Find your best-fit program</Link>
            <Link href="/program-comparison" className="btn btn-outline">Compare programs</Link>
          </>
        }
      />

      <section className="stitch-section">
        <div className="stitch-surface">
          <div className="stitch-section-heading">
            <div className="stitch-kicker">Explore All {WORKFORCEAP_PROGRAM_CATALOG_SIZE}</div>
            <h2>One shell, one card system, one clear decision surface</h2>
            <p>Browse every pathway without the older broken-up visual language. Filters, cards, and actions now feel like part of the same site.</p>
          </div>
          <ProgramsGrid programs={PROGRAMS} />
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-cta-band">
          <div className="stitch-kicker">Need Direction</div>
          <h2>Use the quiz if you want speed. Use comparison if you want precision.</h2>
          <p>The shell stays consistent across both routes so you can move between them without falling back into legacy-looking pages.</p>
          <div className="stitch-actions">
            <Link href="/find-your-path" className="btn btn-primary">Take the career quiz</Link>
            <Link href="/salary-guide" className="btn btn-outline">Review salary ranges</Link>
          </div>
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
