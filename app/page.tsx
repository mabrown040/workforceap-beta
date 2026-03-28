import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Image from 'next/image';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import { Laptop, GraduationCap, Briefcase, Handshake, Users, Building2 } from 'lucide-react';
import Footer from '@/components/Footer';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import StitchStatsBar from '@/components/stitch/StitchStatsBar';
import StitchEmailCapture from '@/components/stitch/StitchEmailCapture';
import StitchMobileNav from '@/components/stitch/StitchMobileNav';
import StitchFooter from '@/components/stitch/StitchFooter';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Tech Career Training in Austin, TX | Workforce Advancement Project',
  description:
    'Get no-cost career certification training in Digital Literacy, Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades. Employer-aligned programs. Apply today — WorkforceAP serves Austin and beyond.',
  path: '/',
});

export default async function HomePage() {
  const activePrograms = await getActivePrograms();
  const featured = activePrograms.filter((p) => p.featured);
  const homeProgramShowcase = (featured.length ? featured : activePrograms).slice(0, 8);
  const programCount = activePrograms.length;

  const journeySteps = [
    { num: 1, title: 'Apply', desc: 'Short online form — about 10 minutes. We respond within 24–48 hours.' },
    { num: 2, title: 'Overview', desc: 'Meet a counselor. Learn which program fits you — no exam, no gatekeeping.' },
    { num: 3, title: 'Membership', desc: 'Join free — no cost to members.' },
    { num: 4, title: 'Assessment', desc: 'Skills and goals. We match you to the right path.' },
    { num: 5, title: 'Interview', desc: '30 minutes. We confirm mutual fit and answer your questions.' },
    { num: 6, title: 'Workforce Readiness', desc: 'Soft skills and job-search basics — what employers expect.' },
    { num: 7, title: 'Resources', desc: 'Tools, network, and loaner laptop program when you complete training (program-dependent).' },
    { num: 8, title: 'Training', desc: 'Industry certification courses. Same credentials employers hire for.' },
    { num: 9, title: 'Certify', desc: 'Earn credentials. Proof that sticks on your resume.' },
    { num: 10, title: 'Placement', desc: 'We support you until you land — resume, interviews, and employer intros.' },
    {
      num: 11,
      title: 'Outcomes',
      desc: 'A role that pays, with room to grow. Many graduates see strong wage gains within a few years.',
    },
  ];

  return (
    <div className="homepage">
      {/* ── Hero ── */}
      <section
        className="wa-relative wa-overflow-hidden wa-bg-m3d-surface"
        aria-label="Hero"
      >
        <div className="wa-mx-auto wa-max-w-7xl wa-px-6 md:wa-px-12 wa-pt-24 wa-pb-20">
          <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-2 wa-gap-12 wa-items-center">
            {/* Left column */}
            <div className="wa-flex wa-flex-col wa-gap-6">
              {/* Enrollment badge */}
              <span className="wa-inline-flex wa-items-center wa-gap-2 wa-w-fit wa-rounded-full wa-bg-m3d-surface-container wa-border wa-border-m3d-outline-variant/20 wa-px-4 wa-py-1.5 wa-text-sm wa-text-m3d-on-surface-variant">
                <span className="wa-relative wa-flex wa-h-2 wa-w-2">
                  <span className="wa-animate-ping wa-absolute wa-inline-flex wa-h-full wa-w-full wa-rounded-full wa-bg-m3d-primary wa-opacity-75" />
                  <span className="wa-relative wa-inline-flex wa-rounded-full wa-h-2 wa-w-2 wa-bg-m3d-primary" />
                </span>
                Now Enrolling in Austin, TX
              </span>

              <h1 className="wa-text-4xl md:wa-text-5xl lg:wa-text-6xl wa-font-extrabold wa-leading-tight wa-text-m3d-on-surface">
                Free Career Training{' '}
                <br />
                <span
                  className="wa-bg-clip-text wa-text-transparent wa-bg-gradient-to-r wa-from-[#ad2c4d] wa-to-[#ffb2bc]"
                >
                  in Austin, TX
                </span>
              </h1>

              <p className="wa-text-lg wa-italic wa-text-m3d-on-surface-variant/85">
                Empowering People. Advancing Futures.
              </p>

              <div className="wa-flex wa-flex-wrap wa-gap-4">
                <ExperimentedCtaLink
                  experiment="home_apply_primary_cta"
                  variants={[
                    { id: 'control', label: 'Apply now — about 10 minutes', className: 'wa-inline-flex wa-items-center wa-justify-center wa-rounded-full wa-bg-m3d-primary wa-text-m3d-on-primary wa-px-8 wa-py-3 wa-font-semibold wa-text-base wa-transition hover:wa-opacity-90', href: '/apply' },
                    { id: 'urgency', label: 'Start your application now', className: 'wa-inline-flex wa-items-center wa-justify-center wa-rounded-full wa-bg-m3d-primary wa-text-m3d-on-primary wa-px-8 wa-py-3 wa-font-semibold wa-text-base wa-transition hover:wa-opacity-90', href: '/apply' },
                  ]}
                />
                <Link
                  href="/programs"
                  className="wa-inline-flex wa-items-center wa-justify-center wa-rounded-full wa-border wa-border-m3d-outline wa-text-m3d-on-surface wa-px-8 wa-py-3 wa-font-semibold wa-text-base wa-transition hover:wa-bg-m3d-surface-container"
                >
                  View Programs
                </Link>
              </div>
            </div>

            {/* Right column */}
            <div className="wa-relative">
              <div className="wa-relative wa-rounded-2xl wa-overflow-hidden wa-aspect-[4/3]">
                <Image
                  src="https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=1920&q=80"
                  alt="Austin skyline at sunset"
                  fill
                  priority
                  fetchPriority="high"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="wa-object-cover"
                />
              </div>
              {/* Floating stat card */}
              <div className="wa-absolute wa-bottom-4 wa-right-4 wa-rounded-xl wa-bg-m3d-surface-container/90 wa-backdrop-blur-sm wa-border wa-border-m3d-outline-variant/20 wa-px-5 wa-py-3 wa-shadow-lg">
                <p className="wa-text-2xl wa-font-bold wa-text-m3d-primary">100%</p>
                <p className="wa-text-sm wa-text-m3d-on-surface-variant">Job Search Support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <StitchStatsBar programCount={programCount} />

      {/* ── Partner Logos ── */}
      <section className="wa-py-12 wa-bg-m3d-surface">
        <div className="wa-mx-auto wa-max-w-7xl wa-px-6 md:wa-px-12">
          <p className="wa-text-center wa-text-xs wa-font-semibold wa-uppercase wa-tracking-widest wa-text-m3d-on-surface-variant/60 wa-mb-8">
            Hiring &amp; Training Partners
          </p>
          <div className="wa-flex wa-flex-wrap wa-items-center wa-justify-center wa-gap-8 md:wa-gap-12">
            {['GOOGLE', 'AWS', 'COMPTIA', 'AT&T', 'COURSERA'].map((name) => (
              <span
                key={name}
                className="wa-text-sm wa-font-bold wa-tracking-wider wa-text-m3d-on-surface-variant/40 wa-grayscale hover:wa-grayscale-0 hover:wa-text-m3d-on-surface-variant wa-transition wa-duration-300 wa-cursor-default"
              >
                {name}
              </span>
            ))}
            <Image
              src="/images/microsoft-logo.svg"
              alt="Microsoft"
              width={100}
              height={24}
              loading="lazy"
              className="wa-opacity-40 wa-grayscale hover:wa-opacity-100 hover:wa-grayscale-0 wa-transition wa-duration-300"
            />
            <Image
              src="/images/ibm-logo.svg"
              alt="IBM"
              width={60}
              height={24}
              loading="lazy"
              className="wa-opacity-40 wa-grayscale hover:wa-opacity-100 hover:wa-grayscale-0 wa-transition wa-duration-300"
            />
          </div>
        </div>
      </section>

      {/* ── Social Proof (prelaunch — CSN credibility) ── */}
      <section
        className="wa-py-20 wa-bg-m3d-surface-container"
        aria-labelledby="home-social-proof-heading"
      >
        <div className="wa-mx-auto wa-max-w-3xl wa-px-6 md:wa-px-12 wa-text-center">
          <h2
            id="home-social-proof-heading"
            className="wa-text-3xl md:wa-text-4xl wa-font-extrabold wa-text-m3d-on-surface wa-mb-6"
          >
            Experience behind WorkforceAP
          </h2>
          <p className="wa-text-base wa-leading-relaxed wa-text-m3d-on-surface-variant wa-mb-4">
            WorkforceAP is still prelaunch — we don&apos;t have graduate stories on this site yet. What we do have is a long run of workforce outcomes through{' '}
            <strong className="wa-text-m3d-on-surface">Consulting Solutions.Net (CSN)</strong>: Austin-area training aligned to real job requirements, strong completion and placement support, and
            thousands of people coached into industry credentials and work. That same leadership team is building WorkforceAP for scale.
          </p>
          <p className="wa-text-base wa-leading-relaxed wa-text-m3d-on-surface-variant wa-mb-8">
            Follow updates and dig into our mission, partners, and board below.
          </p>
          <div className="wa-flex wa-flex-wrap wa-justify-center wa-gap-3">
            <Link
              href="/blog"
              className="wa-inline-flex wa-items-center wa-rounded-full wa-bg-m3d-primary wa-text-m3d-on-primary wa-px-5 wa-py-2 wa-text-sm wa-font-semibold wa-transition hover:wa-opacity-90"
            >
              Blog &amp; Updates
            </Link>
            <Link
              href="/leadership"
              className="wa-inline-flex wa-items-center wa-rounded-full wa-border wa-border-m3d-outline wa-text-m3d-on-surface wa-px-5 wa-py-2 wa-text-sm wa-font-semibold wa-transition hover:wa-bg-m3d-surface-container-high"
            >
              Leadership &amp; Board
            </Link>
            <Link
              href="/what-we-do"
              className="wa-inline-flex wa-items-center wa-rounded-full wa-border wa-border-m3d-outline wa-text-m3d-on-surface wa-px-5 wa-py-2 wa-text-sm wa-font-semibold wa-transition hover:wa-bg-m3d-surface-container-high"
            >
              What we do
            </Link>
          </div>
        </div>
      </section>

      {/* ── Journey to Tech ── */}
      <section className="wa-py-20 wa-bg-m3d-surface" aria-labelledby="journey-heading">
        <div className="wa-mx-auto wa-max-w-7xl wa-px-6 md:wa-px-12">
          <div className="wa-text-center wa-mb-12">
            <h2
              id="journey-heading"
              className="wa-text-3xl md:wa-text-4xl wa-font-extrabold wa-text-m3d-on-surface wa-mb-3"
            >
              The Journey to Tech
            </h2>
            <p className="wa-text-base wa-text-m3d-on-surface-variant">
              Your 11-step path from zero to career-ready
            </p>
          </div>

          <div className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 lg:wa-grid-cols-4 wa-gap-4">
            {/* Steps 1-3: individual small cards */}
            {journeySteps.slice(0, 3).map((step) => (
              <div
                key={step.num}
                className="wa-rounded-xl wa-bg-m3d-surface-container-low wa-border wa-border-m3d-outline-variant/10 wa-p-6 wa-flex wa-flex-col wa-gap-2"
              >
                <span className="wa-text-5xl wa-font-black wa-text-m3d-primary-container/20 wa-leading-none">
                  {String(step.num).padStart(2, '0')}
                </span>
                <h3 className="wa-text-lg wa-font-bold wa-text-m3d-on-surface">{step.title}</h3>
                <p className="wa-text-sm wa-text-m3d-on-surface-variant wa-leading-relaxed">{step.desc}</p>
              </div>
            ))}

            {/* Step 4: highlighted accent card */}
            <div className="wa-rounded-xl wa-bg-m3d-primary-container wa-border wa-border-m3d-outline-variant/10 wa-p-6 wa-flex wa-flex-col wa-gap-2">
              <span className="wa-text-5xl wa-font-black wa-text-m3d-on-primary-container/20 wa-leading-none">04</span>
              <h3 className="wa-text-lg wa-font-bold wa-text-m3d-on-primary-container">{journeySteps[3].title}</h3>
              <p className="wa-text-sm wa-text-m3d-on-primary-container/80 wa-leading-relaxed">{journeySteps[3].desc}</p>
            </div>

            {/* Steps 5-9: wide card spanning 2 cols */}
            <div className="sm:wa-col-span-2 wa-rounded-xl wa-bg-m3d-surface-container-low wa-border wa-border-m3d-outline-variant/10 wa-p-6">
              <span className="wa-text-5xl wa-font-black wa-text-m3d-primary-container/20 wa-leading-none wa-block wa-mb-3">
                05–09
              </span>
              <h3 className="wa-text-lg wa-font-bold wa-text-m3d-on-surface wa-mb-3">Intensive Learning</h3>
              <div className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 wa-gap-3">
                {journeySteps.slice(4, 9).map((step) => (
                  <div key={step.num} className="wa-flex wa-gap-3">
                    <span className="wa-text-sm wa-font-bold wa-text-m3d-primary wa-mt-0.5 wa-shrink-0">
                      {String(step.num).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="wa-text-sm wa-font-semibold wa-text-m3d-on-surface">{step.title}</p>
                      <p className="wa-text-xs wa-text-m3d-on-surface-variant wa-leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 10: individual card */}
            <div className="wa-rounded-xl wa-bg-m3d-surface-container-low wa-border wa-border-m3d-outline-variant/10 wa-p-6 wa-flex wa-flex-col wa-gap-2">
              <span className="wa-text-5xl wa-font-black wa-text-m3d-primary-container/20 wa-leading-none">10</span>
              <h3 className="wa-text-lg wa-font-bold wa-text-m3d-on-surface">{journeySteps[9].title}</h3>
              <p className="wa-text-sm wa-text-m3d-on-surface-variant wa-leading-relaxed">{journeySteps[9].desc}</p>
            </div>

            {/* Step 11: gradient card */}
            <div
              className="wa-rounded-xl wa-border wa-border-m3d-outline-variant/10 wa-p-6 wa-flex wa-flex-col wa-gap-2"
              style={{ background: 'linear-gradient(135deg, var(--m3d-primary-container), #670024)' }}
            >
              <span className="wa-text-5xl wa-font-black wa-text-white/20 wa-leading-none">11</span>
              <h3 className="wa-text-lg wa-font-bold wa-text-white">{journeySteps[10].title}</h3>
              <p className="wa-text-sm wa-text-white/80 wa-leading-relaxed">{journeySteps[10].desc}</p>
            </div>
          </div>

          <div className="wa-text-center wa-mt-10">
            <Link
              href="/how-it-works"
              className="wa-inline-flex wa-items-center wa-rounded-full wa-border wa-border-m3d-outline wa-text-m3d-on-surface wa-px-6 wa-py-2.5 wa-text-sm wa-font-semibold wa-transition hover:wa-bg-m3d-surface-container"
            >
              See Full Process
            </Link>
          </div>
        </div>
      </section>

      {/* ── Who We Serve ── */}
      <section
        className="wa-py-20 wa-bg-m3d-surface-container"
        aria-labelledby="home-audiences-heading"
      >
        <div className="wa-mx-auto wa-max-w-7xl wa-px-6 md:wa-px-12">
          <h2
            id="home-audiences-heading"
            className="wa-text-3xl md:wa-text-4xl wa-font-extrabold wa-text-m3d-on-surface wa-text-center wa-mb-4"
          >
            Who Workforce Advancement Project (WorkforceAP) is for
          </h2>
          <p className="wa-text-base wa-text-m3d-on-surface-variant wa-text-center wa-max-w-2xl wa-mx-auto wa-mb-12">
            One training-and-placement operating model with clear front doors. Austin is where we are proving it first.
          </p>

          <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-6">
            {/* Members & job seekers */}
            <div className="wa-rounded-xl wa-bg-m3d-surface-container wa-border wa-border-m3d-outline-variant/10 wa-p-8 wa-flex wa-flex-col wa-gap-4">
              <span className="wa-text-m3d-primary" aria-hidden="true">
                <Users size={28} />
              </span>
              <h3 className="wa-text-xl wa-font-bold wa-text-m3d-on-surface">Members &amp; job seekers</h3>
              <p className="wa-text-sm wa-text-m3d-on-surface-variant wa-leading-relaxed">
                No-cost industry certifications and counselor support for members — from intake through job search.
              </p>
              <div className="wa-flex wa-flex-wrap wa-gap-3 wa-mt-auto wa-pt-2">
                <Link
                  href="/apply"
                  className="wa-inline-flex wa-items-center wa-rounded-full wa-bg-m3d-primary wa-text-m3d-on-primary wa-px-5 wa-py-2 wa-text-sm wa-font-semibold wa-transition hover:wa-opacity-90"
                >
                  Apply
                </Link>
                <Link
                  href="/find-your-path"
                  className="wa-inline-flex wa-items-center wa-rounded-full wa-border wa-border-m3d-outline wa-text-m3d-on-surface wa-px-5 wa-py-2 wa-text-sm wa-font-semibold wa-transition hover:wa-bg-m3d-surface-container-high"
                >
                  2-min quiz
                </Link>
              </div>
            </div>

            {/* Employers */}
            <div className="wa-rounded-xl wa-bg-m3d-surface-container wa-border wa-border-m3d-outline-variant/10 wa-p-8 wa-flex wa-flex-col wa-gap-4">
              <span className="wa-text-m3d-primary" aria-hidden="true">
                <Building2 size={28} />
              </span>
              <h3 className="wa-text-xl wa-font-bold wa-text-m3d-on-surface">Employers</h3>
              <p className="wa-text-sm wa-text-m3d-on-surface-variant wa-leading-relaxed">
                Post roles, review certify-ready candidates, and hire from a pipeline trained on the credentials you already recognize.
              </p>
              <div className="wa-flex wa-flex-wrap wa-gap-3 wa-mt-auto wa-pt-2">
                <Link
                  href="/employers"
                  className="wa-inline-flex wa-items-center wa-rounded-full wa-bg-m3d-primary wa-text-m3d-on-primary wa-px-5 wa-py-2 wa-text-sm wa-font-semibold wa-transition hover:wa-opacity-90"
                >
                  Employer overview
                </Link>
                <Link
                  href="/jobs"
                  className="wa-inline-flex wa-items-center wa-rounded-full wa-border wa-border-m3d-outline wa-text-m3d-on-surface wa-px-5 wa-py-2 wa-text-sm wa-font-semibold wa-transition hover:wa-bg-m3d-surface-container-high"
                >
                  Public job board
                </Link>
              </div>
            </div>

            {/* Community partners */}
            <div className="wa-rounded-xl wa-bg-m3d-surface-container wa-border wa-border-m3d-outline-variant/10 wa-p-8 wa-flex wa-flex-col wa-gap-4">
              <span className="wa-text-m3d-primary" aria-hidden="true">
                <Handshake size={28} />
              </span>
              <h3 className="wa-text-xl wa-font-bold wa-text-m3d-on-surface">Community partners</h3>
              <p className="wa-text-sm wa-text-m3d-on-surface-variant wa-leading-relaxed">
                Churches, nonprofits, and referral organizations: track referrals, stay in the loop on milestones, and send people to a single apply path.
              </p>
              <div className="wa-flex wa-flex-wrap wa-gap-3 wa-mt-auto wa-pt-2">
                <Link
                  href="/partners"
                  className="wa-inline-flex wa-items-center wa-rounded-full wa-bg-m3d-primary wa-text-m3d-on-primary wa-px-5 wa-py-2 wa-text-sm wa-font-semibold wa-transition hover:wa-opacity-90"
                >
                  Partner with us
                </Link>
                <Link
                  href="/contact"
                  className="wa-inline-flex wa-items-center wa-rounded-full wa-border wa-border-m3d-outline wa-text-m3d-on-surface wa-px-5 wa-py-2 wa-text-sm wa-font-semibold wa-transition hover:wa-bg-m3d-surface-container-high"
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Email Capture ── */}
      <StitchEmailCapture />

      {/* ── Footer ── */}
      <StitchFooter />

      {/* ── Mobile Bottom Nav ── */}
      <StitchMobileNav />
    </div>
  );
}
