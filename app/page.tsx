import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BriefcaseBusiness, GraduationCap, Landmark, Sparkles } from 'lucide-react';
import { buildPageMetadata } from '@/app/seo';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import { PROGRAMS } from '@/lib/content/programs';
import Footer from '@/components/Footer';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Tech Career Training in Austin, TX | Workforce Advancement Project',
  description:
    'Get no-cost career certification training in Digital Literacy, Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades. Employer-aligned programs. Apply today.',
  path: '/',
});

const partnerLogos = [
  { src: '/images/Google_2015_logo.svg.png', alt: 'Google', width: 120, height: 40 },
  { src: '/images/ibm-logo.svg', alt: 'IBM', width: 80, height: 32 },
  { src: '/images/att-logo.png', alt: 'AT&T', width: 80, height: 40 },
  { src: '/images/coursera.png', alt: 'Coursera', width: 120, height: 32 },
  { src: '/images/microsoft-logo.svg', alt: 'Microsoft', width: 120, height: 32 },
  { src: '/images/DOL-logo.png', alt: 'Department of Labor', width: 72, height: 72 },
];

const journeySteps = [
  {
    title: 'Get Matched',
    copy: 'Use the path quiz and admissions review to land on a program with the right ramp, support, and salary trajectory.',
  },
  {
    title: 'Train With Support',
    copy: 'Complete industry-aligned training, certification prep, and weekly coaching without tuition debt.',
  },
  {
    title: 'Build Proof',
    copy: 'Graduate with projects, workforce readiness, and employer-facing credentials instead of generic completion badges.',
  },
  {
    title: 'Move Into Work',
    copy: 'We stay on placement, resume strategy, and employer introductions so the training turns into an actual offer.',
  },
];

export default async function HomePage() {
  const activePrograms = await getActivePrograms();
  const featuredPrograms = PROGRAMS.slice(0, 4);

  return (
    <StitchPage>
      <StitchHero
        badge="Now Enrolling in Austin"
        title={
          <>
            Free career training
            <br />
            built for <span className="stitch-title-highlight">real hiring momentum</span>
          </>
        }
        description={
          <>
            WorkforceAP combines no-cost certification pathways, counseling, and employer-aligned placement support so Austin-area
            residents can move from uncertainty into durable careers without debt.
          </>
        }
        actions={
          <>
            <ExperimentedCtaLink
              experiment="home_apply_primary_cta"
              variants={[
                { id: 'control', label: 'Apply Free', className: 'btn btn-primary btn-large', href: '/apply' },
                { id: 'urgency', label: 'Start your application', className: 'btn btn-primary btn-large', href: '/apply' },
              ]}
            />
            <Link href="/find-your-path" className="btn btn-outline btn-large">
              Find Your Path
            </Link>
          </>
        }
        meta={
          <div className="stitch-stat-grid">
            <div className="stitch-card stitch-stat-card">
              <strong>{activePrograms.length}+</strong>
              <span>Employer-aligned pathways live now</span>
            </div>
            <div className="stitch-card stitch-stat-card">
              <strong>84%</strong>
              <span>Placement momentum within six months</span>
            </div>
            <div className="stitch-card stitch-stat-card">
              <strong>$0</strong>
              <span>Tuition for qualifying members</span>
            </div>
          </div>
        }
        aside={
          <div className="stitch-surface stitch-surface--strong">
            <div className="stitch-pill-row wa-mb-4">
              <span className="stitch-pill">Glassmorphism shell</span>
              <span className="stitch-pill">Crimson accent system</span>
            </div>
            <div className="wa-relative wa-overflow-hidden wa-rounded-[24px]">
              <Image
                src="/images/hero-people.jpg"
                alt="Workforce Advancement Project learners collaborating"
                width={960}
                height={720}
                priority
                className="wa-w-full wa-h-auto wa-object-cover"
              />
            </div>
            <div className="stitch-panel-list wa-mt-4">
              <div>
                <strong className="wa-block wa-mb-2">What changes here</strong>
                <p>No more legacy white bands, mixed shell treatments, or duplicated chrome. The public site now reads as one consistent product.</p>
              </div>
            </div>
          </div>
        }
      />

      <section className="stitch-section">
        <div className="stitch-section-heading">
          <div className="stitch-kicker">Program Direction</div>
          <h2>Choose a path with signal, not noise</h2>
          <p>The best-fit programs already pointed toward the Stitch direction. Home now matches them with stronger hierarchy, cleaner surfaces, and consistent premium spacing.</p>
        </div>
        <div className="stitch-grid-2">
          {featuredPrograms.map((program) => (
            <article key={program.slug} className="stitch-card">
              <div className="stitch-pill-row wa-mb-4">
                <span className="stitch-pill">{program.partner}</span>
                <span className="stitch-pill">{program.duration}</span>
              </div>
              <h3 className="wa-text-2xl wa-font-bold">{program.title}</h3>
              <p className="wa-mt-3">
                {program.partner}-aligned training with a {program.duration.toLowerCase()} timeline and published salary range of {program.salary.replace('Starting salary: ', '')}.
              </p>
              <div className="stitch-pill-row wa-mt-4">
                {program.skills.slice(0, 3).map((skill) => (
                  <span key={skill} className="stitch-pill">
                    {skill}
                  </span>
                ))}
              </div>
              <div className="wa-mt-5 wa-flex wa-flex-wrap wa-gap-3">
                <Link href={`/apply?program=${program.slug}`} className="btn btn-primary">
                  Apply for this track
                </Link>
                <Link href="/programs" className="btn btn-outline">
                  Browse all programs
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-grid-2">
          <div className="stitch-surface">
            <div className="stitch-kicker">How It Works</div>
            <h2 className="wa-text-4xl wa-font-bold wa-leading-[1.02] wa-mt-3">A tighter path from training to placement</h2>
            <p className="wa-mt-4 stitch-muted">
              Every step is designed to reduce drop-off and keep the site anchored around outcomes: fit, training, certification, placement.
            </p>
            <div className="stitch-panel-list wa-mt-6">
              {journeySteps.map((step, index) => (
                <div key={step.title} className="wa-flex wa-gap-4 wa-items-start">
                  <div className="stitch-step-number">{String(index + 1).padStart(2, '0')}</div>
                  <div>
                    <strong className="wa-block">{step.title}</strong>
                    <p className="wa-mt-2">{step.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="stitch-surface stitch-surface--strong">
            <div className="stitch-kicker">Employer Signals</div>
            <h2 className="wa-text-4xl wa-font-bold wa-leading-[1.02] wa-mt-3">Built for Austin demand, not abstract promises</h2>
            <p className="wa-mt-4 stitch-muted">
              We frame the public site around employer relevance, salary context, and support systems because that is what makes the platform credible.
            </p>
            <div className="stitch-grid-2 wa-mt-6">
              <div className="stitch-card">
                <GraduationCap className="wa-text-[#ffb2bc]" />
                <strong className="wa-block wa-mt-3">Certification-first tracks</strong>
                <p className="wa-mt-2">Google, IBM, AWS, CompTIA, healthcare, trades, and business pathways live under one consistent shell.</p>
              </div>
              <div className="stitch-card">
                <BriefcaseBusiness className="wa-text-[#ffb2bc]" />
                <strong className="wa-block wa-mt-3">Placement support baked in</strong>
                <p className="wa-mt-2">Job board, employer routing, and counseling stay intact while the marketing presentation becomes stronger.</p>
              </div>
              <div className="stitch-card">
                <Landmark className="wa-text-[#ffb2bc]" />
                <strong className="wa-block wa-mt-3">No-cost access</strong>
                <p className="wa-mt-2">The funding story is clearer: no tuition, publicly aligned workforce support, cleaner calls to action.</p>
              </div>
              <div className="stitch-card">
                <Sparkles className="wa-text-[#ffb2bc]" />
                <strong className="wa-block wa-mt-3">Premium default shell</strong>
                <p className="wa-mt-2">Dark by default, glass cards, crimson gradient accents, and consistent section rhythm across public routes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-surface">
          <div className="stitch-kicker">Partner Ecosystem</div>
          <h2 className="wa-text-4xl wa-font-bold wa-mt-3">Training and hiring partners already in the story</h2>
          <p className="wa-mt-4 stitch-muted">The homepage now treats partner trust as a designed surface instead of a leftover logo strip.</p>
          <div className="wa-flex wa-flex-wrap wa-items-center wa-gap-10 wa-justify-center wa-mt-8 wa-opacity-80">
            {partnerLogos.map((logo) => (
              <Image
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                className="wa-h-8 md:wa-h-10 wa-w-auto wa-object-contain"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-cta-band">
          <div className="stitch-kicker">Next Step</div>
          <h2>See where you fit, then move</h2>
          <p>The shell is now consistent. The next decision should be yours: take the quiz, compare programs, or start the application.</p>
          <div className="stitch-actions">
            <Link href="/find-your-path" className="btn btn-outline">
              Take the 2-minute quiz
            </Link>
            <Link href="/programs" className="btn btn-outline">
              Compare the program catalog
            </Link>
            <Link href="/apply" className="btn btn-primary">
              Start your application
            </Link>
          </div>
        </div>
      </section>

      <Footer variant="home" />
    </StitchPage>
  );
}
