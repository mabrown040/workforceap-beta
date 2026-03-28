import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Image from 'next/image';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Tech Career Training in Austin, TX | Workforce Advancement Project',
  description:
    'Get no-cost career certification training in Digital Literacy, Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades. Employer-aligned programs. Apply today — WorkforceAP serves Austin and beyond.',
  path: '/',
});

export default async function HomePage() {
  return (
    <div className="bg-surface text-on-surface antialiased overflow-x-hidden">
      {/* Hero Section */}
      <section className="px-6 md:px-12 py-20 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center space-x-2 bg-secondary-container/20 border border-outline-variant/15 px-4 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Now Enrolling in Austin, TX</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-none text-on-surface">
            Free Career Training <br />
            in <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container to-primary">Austin, TX</span>
          </h1>
          <p className="text-xl text-on-surface-variant max-w-lg leading-relaxed">
            Empowering People. Advancing Futures. Get technical, healthcare, trades, or data certifications required by top employers — at zero cost to qualifying members.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <ExperimentedCtaLink
              experiment="hero_cta"
              variants={[
                {
                  id: 'control',
                  label: 'Apply Free — Takes 10 Minutes',
                  href: '/apply',
                  className: 'bg-primary-container text-on-primary px-8 py-4 rounded-lg font-bold text-lg hover:shadow-lg transition-all text-center',
                },
                {
                  id: 'variant_a',
                  label: 'Start Your New Career',
                  href: '/apply',
                  className: 'bg-primary-container text-on-primary px-8 py-4 rounded-lg font-bold text-lg hover:shadow-lg transition-all text-center',
                }
              ]}
            />
            <Link href="/programs" className="bg-surface-container-high text-on-surface px-8 py-4 rounded-lg font-bold text-lg border border-outline-variant/15 text-center hover:bg-surface-container-highest transition-colors">
              View Programs
            </Link>
          </div>
        </div>
        <div className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-tr from-primary-container/20 to-transparent blur-3xl opacity-50"></div>
          <Image
            src="https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=800&q=80"
            alt="Modern classroom or workspace in Austin"
            width={800}
            height={600}
            className="relative rounded-xl w-full aspect-[4/3] object-cover border border-outline-variant/30 shadow-2xl"
          />
          <div className="absolute -bottom-6 -right-6 bg-surface-container p-6 rounded-xl border border-outline-variant/30 shadow-xl hidden md:block">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary" aria-hidden>verified</span>
              </div>
              <div>
                <div className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">Placement Rate</div>
                <div className="text-2xl font-black text-primary">100%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-surface-container-low py-12">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          <div className="space-y-2">
            <div className="text-4xl font-black text-primary">{WORKFORCEAP_PROGRAM_CATALOG_SIZE}+</div>
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant">Specialized Programs</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-black text-primary">$0</div>
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant">Total Tuition Cost</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-black text-primary">16-20</div>
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant">Weeks to Graduate</div>
          </div>
        </div>
      </section>

      {/* Partner Logos */}
      <section className="py-16 px-8 bg-surface">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-12">Hiring &amp; Training Partners</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="text-2xl font-black tracking-tighter text-on-surface">GOOGLE</div>
            <div className="text-2xl font-black tracking-tighter text-on-surface">IBM</div>
            <div className="text-2xl font-black tracking-tighter text-on-surface">AWS</div>
            <div className="text-2xl font-black tracking-tighter text-on-surface">COMPTIA</div>
            <div className="text-2xl font-black tracking-tighter text-on-surface">MICROSOFT</div>
          </div>
        </div>
      </section>

      {/* How it works — applicant-benefit-driven, confidence-building */}
      <section className="py-24 px-8 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold tracking-tight text-on-surface mb-4">The Journey to Tech</h2>
            <p className="text-on-surface-variant">Your 11-step path from zero to career-ready.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
              <div className="text-4xl font-black text-primary/20 mb-4">01</div>
              <h4 className="font-bold mb-2">Quiz</h4>
              <p className="text-sm text-on-surface-variant">2-minute skill alignment quiz.</p>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
              <div className="text-4xl font-black text-primary/20 mb-4">02</div>
              <h4 className="font-bold mb-2">Apply</h4>
              <p className="text-sm text-on-surface-variant">Simple 10-minute application.</p>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
              <div className="text-4xl font-black text-primary/20 mb-4">03</div>
              <h4 className="font-bold mb-2">Interview</h4>
              <p className="text-sm text-on-surface-variant">Quick conversational screen.</p>
            </div>
            <div className="bg-primary/10 p-6 rounded-xl border border-primary/30">
              <div className="text-4xl font-black text-primary mb-4">04</div>
              <h4 className="font-bold mb-2">Enroll</h4>
              <p className="text-sm text-primary-fixed-dim">Acceptance and orientation.</p>
            </div>

            {/* Steps 5-9 Simplified for Visual Flow */}
            <div className="lg:col-span-2 bg-surface-container-high p-8 rounded-xl flex items-center gap-8">
              <div className="text-4xl font-black text-primary/20">05-09</div>
              <div>
                <h4 className="font-bold text-xl mb-1">Intensive Learning</h4>
                <p className="text-sm text-on-surface-variant">Certification-focused training, labs, and soft skills workshops over 16-20 weeks.</p>
              </div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
              <div className="text-4xl font-black text-primary/20 mb-4">10</div>
              <h4 className="font-bold mb-2">Certify</h4>
              <p className="text-sm text-on-surface-variant">Earn industry-recognized badges.</p>
            </div>
            <div className="bg-gradient-to-br from-primary to-on-primary-fixed p-6 rounded-xl">
              <div className="text-4xl font-black text-white/40 mb-4">11</div>
              <h4 className="font-bold mb-2 text-white">Hired</h4>
              <p className="text-sm text-white/80">Direct connection to Austin&apos;s top employers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Email Capture Widget */}
      <section className="py-24 px-8">
        <div className="max-w-4xl mx-auto bg-surface-container p-12 rounded-2xl border border-outline-variant/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10 text-center space-y-8">
            <h2 className="text-3xl font-bold text-on-surface">Not ready to apply?</h2>
            <p className="text-on-surface-variant max-w-md mx-auto">Get our monthly career guide for Austin&apos;s tech scene and success stories from your neighborhood.</p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                className="flex-1 bg-surface-container-high border-none rounded-lg focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant px-4 py-3"
                placeholder="Email address"
                type="email"
              />
              <button className="bg-primary text-on-primary px-6 py-3 rounded-lg font-bold whitespace-nowrap hover:brightness-110 transition-all">Stay in the loop</button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
