import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Image from 'next/image';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import Footer from '@/components/Footer';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import StatsBar from '@/components/home/StatsBar';

import EmailCaptureWidget from '@/components/home/EmailCaptureWidget';
import MobileBottomNav from '@/components/home/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Tech Career Training in Austin, TX | Workforce Advancement Project',
  description:
    'Get no-cost career certification training in Digital Literacy, Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades. Employer-aligned programs. Apply today — WorkforceAP serves Austin and beyond.',
  path: '/',
});

export default async function HomePage() {
  const activePrograms = await getActivePrograms();
  const programCount = activePrograms.length;

  const journeySteps = [
    { num: '01', title: 'Take the Quiz', desc: 'Complete our 2-minute career alignment quiz to discover which tech career path matches your interests, experience, and goals.' },
    { num: '02', title: 'Apply Online', desc: 'Submit a simple 10-minute application. No prior tech experience required — we meet you where you are.' },
    { num: '03', title: 'Interview', desc: 'Have a quick conversational screen with our admissions team. We want to learn about your motivation and career goals.' },
    { num: '04', title: 'Get Accepted & Enroll', desc: 'Receive your acceptance letter, complete orientation, and get set up with all the tools and resources you need to succeed.', highlight: true },
    { num: '05', title: 'Foundation Training', desc: 'Build your digital literacy and professional skills foundation. Learn collaboration tools, workplace communication, and core concepts.' },
    { num: '06', title: 'Technical Deep-Dive', desc: 'Dive into hands-on technical coursework with instructor-led labs, real-world projects, and industry-standard tools.' },
    { num: '07', title: 'Soft Skills & Career Prep', desc: 'Develop interview skills, build your professional brand, create your resume, and practice technical communication.' },
    { num: '08', title: 'Capstone Project', desc: 'Apply everything you\'ve learned in a real-world capstone project that becomes part of your professional portfolio.' },
    { num: '09', title: 'Exam Preparation', desc: 'Intensive certification exam prep with practice tests, study groups, and one-on-one coaching from certified instructors.' },
    { num: '10', title: 'Earn Your Certification', desc: 'Pass your industry-recognized certification exam. Our graduates hold credentials from Google, IBM, CompTIA, AWS, and more.', highlight: true },
    { num: '11', title: 'Get Hired', desc: 'Connect directly with Austin\'s top employers through our hiring partner network. 84% placement rate within 6 months of graduation.', gradient: true },
  ];


  const partnerLogos = [
    { src: '/images/Google_2015_logo.svg.png', alt: 'Google', width: 120, height: 40 },
    { src: '/images/ibm-logo.svg', alt: 'IBM', width: 80, height: 32 },
    { src: '/images/att-logo.png', alt: 'AT&T', width: 80, height: 40 },
    { src: '/images/coursera.png', alt: 'Coursera', width: 120, height: 32 },
    { src: '/images/microsoft-logo.svg', alt: 'Microsoft', width: 120, height: 32 },
    { src: '/images/DOL-logo.png', alt: 'Department of Labor', width: 80, height: 80 },
  ];

  return (
    <div className="homepage wa-bg-white dark:wa-bg-[#141313] wa-text-gray-900 dark:wa-text-[#e6e1e1]">
      {/* Hero */}
      <section className="wa-pt-24 wa-pb-20 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-7xl wa-mx-auto wa-grid wa-gap-12 wa-items-center lg:wa-grid-cols-2">
          <div className="wa-flex wa-flex-col wa-gap-8">
            {/* Enrollment badge */}
            <div className="wa-inline-flex wa-items-center wa-gap-2 wa-bg-[rgba(113,51,62,0.1)] dark:wa-bg-[rgba(113,51,62,0.2)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-px-4 wa-py-1.5 wa-rounded-full wa-w-fit">
              <span className="wa-w-2 wa-h-2 wa-rounded-full wa-bg-[#ad2c4d] wa-inline-block wa-animate-pulse" />
              <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">Now Enrolling in Austin, TX</span>
            </div>

            <h1 className="wa-text-5xl md:wa-text-7xl wa-font-extrabold wa-tracking-tight wa-leading-none wa-text-gray-900 dark:wa-text-[#e6e1e1]">
              Free Career Training <br />in{' '}
              <span className="wa-bg-gradient-to-r wa-from-[#ad2c4d] wa-to-[#ffb2bc] wa-bg-clip-text" style={{ WebkitTextFillColor: 'transparent' }}>
                Austin, TX
              </span>
            </h1>

            <p className="wa-text-xl wa-text-gray-600 dark:wa-text-[#debfc2] wa-max-w-lg wa-leading-relaxed">
              Empowering People. Advancing Futures. Start your new career journey today with tuition-free technical education.
            </p>

            <div className="wa-flex wa-flex-wrap wa-gap-4">
              <ExperimentedCtaLink
                experiment="home_apply_primary_cta"
                variants={[
                  { id: 'control', label: 'Apply Free — Takes 10 Minutes', className: 'btn btn-accent btn-large', href: '/apply' },
                  { id: 'urgency', label: 'Start your application now', className: 'btn btn-accent btn-large', href: '/apply' },
                ]}
              />
              <Link
                href="/programs"
                className="wa-bg-gray-100 dark:wa-bg-[#2b2a2a] wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-px-8 wa-py-4 wa-rounded-lg wa-font-bold wa-text-lg wa-border wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.15)] wa-no-underline wa-inline-block hover:wa-bg-gray-200 dark:hover:wa-bg-[#3a3939] wa-transition-colors"
              >
                View Programs
              </Link>
            </div>
          </div>

          {/* Hero image */}
          <div className="wa-relative">
            <div className="wa-absolute wa--inset-4 wa-bg-gradient-to-tr wa-from-[rgba(173,44,77,0.2)] wa-to-transparent wa-blur-[48px] wa-opacity-50 wa-rounded-xl" />
            <Image
              src="/images/hero-people.jpg"
              alt="Modern high-tech classroom in Austin with diverse adult students collaborating"
              width={800}
              height={600}
              priority
              fetchPriority="high"
              className="wa-relative wa-rounded-xl wa-w-full wa-h-auto wa-object-cover wa-border wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.3)] wa-shadow-2xl"
              style={{ aspectRatio: '4/3' }}
            />
            {/* Floating placement rate badge */}
            <div className="wa-hidden md:wa-block wa-absolute wa--bottom-6 wa--right-6 wa-bg-white dark:wa-bg-[#201f1f] wa-p-6 wa-rounded-xl wa-border wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.3)] wa-shadow-xl">
              <div className="wa-flex wa-items-center wa-gap-4">
                <div className="wa-w-12 wa-h-12 wa-rounded-full wa-bg-[#ad2c4d] wa-flex wa-items-center wa-justify-center wa-text-xl wa-text-white">✓</div>
                <div>
                  <div className="wa-text-xs wa-uppercase wa-font-bold wa-text-gray-500 dark:wa-text-[#debfc2] wa-tracking-wide">Placement Rate</div>
                  <div className="wa-text-2xl wa-font-black wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">84%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <StatsBar />

      {/* Partner Logos */}
      <section className="wa-py-16 wa-px-8 wa-bg-gray-50 dark:wa-bg-[#141313]">
        <div className="wa-max-w-7xl wa-mx-auto">
          <p className="wa-text-center wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-gray-500 dark:wa-text-[#debfc2] wa-mb-12">
            Hiring &amp; Training Partners
          </p>
          <div className="wa-flex wa-flex-wrap wa-justify-center wa-items-center wa-gap-12 md:wa-gap-24 wa-opacity-60 dark:wa-opacity-60">
            {partnerLogos.map((logo) => (
              <Image
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                className="wa-h-8 md:wa-h-10 wa-w-auto wa-object-contain dark:wa-brightness-0 dark:wa-invert"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Graduate Stories — placeholder: will add when we have real testimonials */}

      {/* Journey Bento Grid */}
      <section className="wa-py-24 wa-px-8 wa-bg-gray-50 dark:wa-bg-[#141313]">
        <div className="wa-max-w-7xl wa-mx-auto">
          <div className="wa-text-center wa-mb-20">
            <h2 className="wa-text-4xl wa-font-bold wa-tracking-tight wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-mb-4">The Journey to Tech</h2>
            <p className="wa-text-gray-600 dark:wa-text-[#debfc2]">Your 11-step path from zero to career-ready.</p>
          </div>
          <div className="wa-grid wa-gap-4 sm:wa-grid-cols-2 lg:wa-grid-cols-3">
            {journeySteps.map((step) => {
              if (step.gradient) {
                return (
                  <div key={step.num} className="wa-bg-gradient-to-br wa-from-[#ad2c4d] wa-to-[#670024] wa-p-6 wa-rounded-xl sm:wa-col-span-2 lg:wa-col-span-1">
                    <div className="wa-text-4xl wa-font-black wa-text-white/40 wa-mb-4">{step.num}</div>
                    <h4 className="wa-font-bold wa-mb-2 wa-text-white wa-text-lg">{step.title}</h4>
                    <p className="wa-text-sm wa-text-white/80 wa-leading-relaxed">{step.desc}</p>
                  </div>
                );
              }
              return (
                <div
                  key={step.num}
                  className={`wa-p-6 wa-rounded-xl wa-border ${
                    step.highlight
                      ? 'wa-bg-[rgba(173,44,77,0.05)] dark:wa-bg-[rgba(173,44,77,0.1)] wa-border-[rgba(173,44,77,0.2)] dark:wa-border-[rgba(173,44,77,0.3)]'
                      : 'wa-bg-white dark:wa-bg-[#1c1b1b] wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.1)]'
                  }`}
                >
                  <div className={`wa-text-4xl wa-font-black wa-mb-4 ${step.highlight ? 'wa-text-[#ad2c4d]' : 'wa-text-[rgba(173,44,77,0.2)]'}`}>{step.num}</div>
                  <h4 className="wa-font-bold wa-mb-2 wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-text-lg">{step.title}</h4>
                  <p className={`wa-text-sm wa-leading-relaxed ${step.highlight ? 'wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]' : 'wa-text-gray-600 dark:wa-text-[#debfc2]'}`}>{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Austin skyline section */}
      <section className="wa-relative wa-py-24 wa-px-8 wa-overflow-hidden">
        <div className="wa-absolute wa-inset-0">
          <Image
            src="/images/austin-skyline.jpg"
            alt="Austin, Texas skyline"
            fill
            className="wa-object-cover"
          />
          <div className="wa-absolute wa-inset-0 wa-bg-black/60 dark:wa-bg-black/70" />
        </div>
        <div className="wa-relative wa-z-10 wa-max-w-4xl wa-mx-auto wa-text-center">
          <h2 className="wa-text-4xl wa-font-bold wa-text-white wa-mb-6">Built for Austin. Designed for Impact.</h2>
          <p className="wa-text-xl wa-text-white/80 wa-max-w-2xl wa-mx-auto wa-leading-relaxed wa-mb-8">
            WorkforceAP partners with Austin&apos;s leading employers to create direct pipelines from training to careers. Our {programCount}+ programs are designed around real hiring needs in our community.
          </p>
          <Link
            href="/what-we-do"
            className="wa-inline-block wa-bg-[#ad2c4d] wa-text-white wa-px-8 wa-py-4 wa-rounded-lg wa-font-bold wa-text-lg wa-no-underline hover:wa-bg-[#8a2340] wa-transition-colors"
          >
            Learn About Our Mission
          </Link>
        </div>
      </section>

      {/* Email Capture */}
      <EmailCaptureWidget />

      {/* Footer */}
      <footer className="wa-bg-gray-50 dark:wa-bg-[#141313] wa-border-t wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.15)]">
        <div className="wa-grid wa-gap-12 wa-p-12 md:wa-p-16 wa-max-w-7xl wa-mx-auto md:wa-grid-cols-3">
          <div className="wa-flex wa-flex-col wa-gap-6">
            <div className="wa-text-lg wa-font-black wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-uppercase wa-tracking-[0.1em]">WorkforceAP</div>
            <p className="wa-text-sm wa-text-gray-600 dark:wa-text-[#debfc2] wa-leading-relaxed">
              Bridging the opportunity gap in Austin through world-class technical training and direct employer pipelines.
            </p>
          </div>
          <div className="wa-flex wa-flex-col wa-gap-4">
            <h4 className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.2em] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">Explore</h4>
            <Link href="/programs" className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-no-underline wa-text-sm hover:wa-text-gray-900 dark:hover:wa-text-white wa-transition-colors">Programs</Link>
            <Link href="/blog" className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-no-underline wa-text-sm hover:wa-text-gray-900 dark:hover:wa-text-white wa-transition-colors">Graduate Stories</Link>
            <Link href="/partners" className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-no-underline wa-text-sm hover:wa-text-gray-900 dark:hover:wa-text-white wa-transition-colors">Partner Network</Link>
            <Link href="/privacy" className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-no-underline wa-text-sm hover:wa-text-gray-900 dark:hover:wa-text-white wa-transition-colors">Privacy Policy</Link>
          </div>
          <div className="wa-flex wa-flex-col wa-gap-4">
            <h4 className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.2em] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">Connect</h4>
            <Link href="/contact" className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-no-underline wa-text-sm hover:wa-text-gray-900 dark:hover:wa-text-white wa-transition-colors">Contact Us</Link>
            <a href="https://www.linkedin.com/company/workforce-advancement-project" target="_blank" rel="noopener noreferrer" className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-no-underline wa-text-sm hover:wa-text-gray-900 dark:hover:wa-text-white wa-transition-colors">LinkedIn</a>
          </div>
        </div>
        <div className="wa-py-8 wa-px-12 wa-text-center wa-border-t wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.15)]">
          <p className="wa-text-xs wa-text-gray-400 dark:wa-text-[#584144]">&copy; {new Date().getFullYear()} WorkforceAP Austin. All rights reserved.</p>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
    </div>
  );
}
