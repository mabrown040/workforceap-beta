import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import { Handshake, Users, Award, ArrowRight, HelpCircle, Briefcase, Building2, Landmark, Heart } from 'lucide-react';
import MainNav from '@/components/MainNav';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Community & Employer Partners | Austin Workforce Development',
  description:
    'Partner with WorkforceAP: employers hire talent, referral orgs send candidates, workforce boards align, funders support scale. Clear next steps for each.',
  path: '/partners',
});

const PARTNER_TYPES = [
  {
    icon: Briefcase,
    type: 'Employers',
    who: 'Companies hiring for IT, cyber, data, project management, healthcare, trades.',
    why: 'Access pre-screened, certified talent. Post jobs or become a hiring partner for first access to cohorts.',
    nextStep: { text: 'Visit Employer Page', href: '/employers' },
  },
  {
    icon: Users,
    type: 'Referral & Community Orgs',
    who: 'Nonprofits, social services, churches, reentry programs, community centers, workforce centers, federal one-stop centers.',
    why: 'Refer clients who need career training. We follow up within 24–48 hours. No cost to refer. You get updates when referred individuals complete programs.',
    nextStep: { text: 'Contact to Refer', href: '/contact?topic=partnership' },
  },
  {
    icon: Landmark,
    type: 'Workforce Boards & Agencies',
    who: 'Workforce Solutions, TWC, WIOA providers, government workforce programs.',
    why: 'Align your participants with employer-recognized in-demand certifications. We handle training and placement; you strengthen outcomes for your population.',
    nextStep: { text: 'Discuss Alignment', href: '/contact?topic=partnership' },
  },
  {
    icon: Heart,
    type: 'Supporters & Funders',
    who: 'Foundations, corporate giving, impact investors, individual donors.',
    why: "Fund a model that works. Employer-aligned training, no participant debt, measurable job outcomes. We're launching in Austin and building toward expansion.",
    nextStep: { text: 'Learn How to Support', href: '/contact?topic=partnership' },
  },
];

export default function PartnersPage() {
  return (
    <div className="wa-min-h-screen wa-bg-[#141313] wa-text-[#e6e1e1]">
      <MainNav />

      {/* Hero */}
      <section className="wa-pt-32 wa-pb-16 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-5xl wa-mx-auto wa-text-center">
          <div className="wa-inline-flex wa-items-center wa-gap-2 wa-bg-[rgba(113,51,62,0.2)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-px-4 wa-py-1.5 wa-rounded-full wa-mb-6">
            <span className="wa-w-2 wa-h-2 wa-rounded-full wa-bg-[#ad2c4d] wa-inline-block" />
            <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ffb2bc]">Partnerships</span>
          </div>
          <h1 className="wa-text-5xl md:wa-text-6xl wa-font-extrabold wa-tracking-tight wa-leading-none wa-mb-4">
            Partner{' '}
            <span style={{ backgroundImage: 'linear-gradient(to right, #ad2c4d, #ffb2bc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              With Us
            </span>
          </h1>
          <p className="wa-text-xl wa-text-[#debfc2] wa-max-w-2xl wa-mx-auto">
            Different partners, different roles. Find yours and take the next step.
          </p>
        </div>
      </section>

      <section className="wa-pb-24 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-6xl wa-mx-auto">

          {/* Partner type cards */}
          <div className="wa-mb-4 wa-text-center">
            <div className="wa-inline-flex wa-items-center wa-gap-2 wa-bg-[rgba(113,51,62,0.2)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-px-4 wa-py-1.5 wa-rounded-full wa-mb-8">
              <span className="wa-w-2 wa-h-2 wa-rounded-full wa-bg-[#ad2c4d] wa-inline-block" />
              <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ffb2bc]">What Kind of Partner Are You?</span>
            </div>
          </div>

          <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 wa-gap-4 wa-mb-16">
            {PARTNER_TYPES.map(({ icon: Icon, type, who, why, nextStep }) => (
              <div key={type} className="wa-bg-white/5 wa-border wa-border-white/10 wa-rounded-2xl wa-backdrop-blur wa-p-7 wa-flex wa-flex-col wa-gap-3">
                <div className="wa-text-[#ad2c4d]"><Icon size={28} /></div>
                <h3 className="wa-text-lg wa-font-bold wa-text-[#e6e1e1]">{type}</h3>
                <p className="wa-text-sm wa-text-[#debfc2] wa-leading-relaxed">
                  <strong className="wa-text-[#e6e1e1]">You are:</strong> {who}
                </p>
                <p className="wa-text-sm wa-text-[#debfc2] wa-leading-relaxed">
                  <strong className="wa-text-[#e6e1e1]">Why partner:</strong> {why}
                </p>
                <div className="wa-mt-auto wa-pt-2">
                  <Link
                    href={nextStep.href}
                    className="wa-inline-flex wa-items-center wa-gap-1.5 wa-px-5 wa-py-2.5 wa-border wa-border-[rgba(173,44,77,0.5)] wa-text-[#ffb2bc] wa-rounded-xl wa-text-sm wa-font-semibold wa-no-underline hover:wa-bg-[rgba(173,44,77,0.1)] wa-transition-colors"
                  >
                    {nextStep.text} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* How Referrals Work */}
          <div className="wa-mb-4">
            <div className="wa-inline-flex wa-items-center wa-gap-2 wa-bg-[rgba(113,51,62,0.2)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-px-4 wa-py-1.5 wa-rounded-full wa-mb-8">
              <span className="wa-w-2 wa-h-2 wa-rounded-full wa-bg-[#ad2c4d] wa-inline-block" />
              <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ffb2bc]">How Referrals Work</span>
            </div>
          </div>

          <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 wa-gap-8 wa-mb-16">
            <div className="wa-bg-white/5 wa-border wa-border-white/10 wa-rounded-2xl wa-backdrop-blur wa-p-7">
              <p className="wa-text-[#debfc2] wa-leading-relaxed wa-mb-4">Referral partners send us candidates who may benefit from complimentary career training. We reach out within 24–48 hours and walk them through the process.</p>
              <ul className="wa-flex wa-flex-col wa-gap-2 wa-pl-0" style={{ listStyle: 'none' }}>
                {[
                  'Submit a referral via our contact form or partner portal',
                  'We contact the candidate within 24–48 hours',
                  'Accepted members receive training, certifications, and job placement support',
                  'You receive updates when referred individuals complete programs',
                ].map((item) => (
                  <li key={item} className="wa-flex wa-items-start wa-gap-2 wa-text-sm wa-text-[#debfc2]">
                    <span className="wa-text-[#ad2c4d] wa-mt-0.5">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="wa-bg-white/5 wa-border wa-border-white/10 wa-rounded-2xl wa-backdrop-blur wa-p-7">
              <p className="wa-text-[#debfc2] wa-leading-relaxed wa-mb-6">Best referrals: motivated to finish training, interested in tech, healthcare, manufacturing, or trades. Currently serving Austin area; expanding over time.</p>
              <Link
                href="/contact?topic=partnership"
                className="wa-inline-flex wa-items-center wa-gap-2 wa-px-6 wa-py-3 wa-bg-gradient-to-r wa-from-[#ad2c4d] wa-to-[#c9364f] wa-text-white wa-rounded-xl wa-font-bold wa-no-underline hover:wa-opacity-90 wa-transition-opacity"
              >
                Contact us to refer <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Partner FAQ */}
          <div className="wa-mb-4">
            <div className="wa-inline-flex wa-items-center wa-gap-2 wa-bg-[rgba(113,51,62,0.2)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-px-4 wa-py-1.5 wa-rounded-full wa-mb-8">
              <span className="wa-w-2 wa-h-2 wa-rounded-full wa-bg-[#ad2c4d] wa-inline-block" />
              <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ffb2bc]">Partner FAQ</span>
            </div>
          </div>

          <div className="wa-flex wa-flex-col wa-gap-3 wa-max-w-[720px] wa-mb-16">
            {[
              {
                q: 'Who can become a partner?',
                a: 'Employers, workforce development boards, community organizations, social service agencies, and educational institutions can partner with WorkforceAP to refer candidates or hire graduates.',
              },
              {
                q: 'Is there a cost to refer candidates?',
                a: 'No. Referrals are free. We welcome partners who want to connect individuals in their network with our free career training programs.',
              },
              {
                q: 'How do I refer someone?',
                a: "Contact us at info@workforceap.org or (512) 777-1808 with the candidate's name and contact information. You can also use our contact form and select \"Partnership\" as the topic.",
              },
              {
                q: 'Can I hire WorkforceAP graduates?',
                a: 'Yes. We actively connect employers with job-ready graduates. Reach out to discuss your hiring needs and we can share candidate profiles and schedule introductions.',
              },
            ].map((item) => (
              <details
                key={item.q}
                className="wa-bg-white/5 wa-border wa-border-white/10 wa-rounded-2xl wa-overflow-hidden"
              >
                <summary className="wa-flex wa-items-center wa-justify-between wa-px-5 wa-py-4 wa-cursor-pointer wa-font-semibold wa-text-[#e6e1e1] wa-text-sm" style={{ listStyle: 'none' }}>
                  {item.q}
                  <span className="wa-text-[#ad2c4d] wa-text-xl wa-leading-none">+</span>
                </summary>
                <div className="wa-px-5 wa-pb-5 wa-border-t wa-border-white/[0.06]">
                  <p className="wa-text-[#debfc2] wa-text-sm wa-leading-relaxed wa-mt-3">{item.a}</p>
                </div>
              </details>
            ))}
          </div>

          {/* CTA */}
          <div className="wa-bg-[rgba(173,44,77,0.08)] wa-border wa-border-[rgba(173,44,77,0.2)] wa-rounded-2xl wa-p-10 wa-text-center">
            <h2 className="wa-text-2xl wa-font-bold wa-text-[#e6e1e1] wa-mb-2">Ready to connect?</h2>
            <p className="wa-text-[#debfc2] wa-mb-6">Whether you hire, refer, or fund — there&rsquo;s a place for you in this work.</p>
            <div className="wa-flex wa-flex-wrap wa-gap-3 wa-justify-center">
              <Link
                href="/contact?topic=partnership"
                className="wa-inline-flex wa-items-center wa-px-6 wa-py-3 wa-bg-gradient-to-r wa-from-[#ad2c4d] wa-to-[#c9364f] wa-text-white wa-rounded-xl wa-font-bold wa-no-underline hover:wa-opacity-90 wa-transition-opacity"
              >
                Get in Touch
              </Link>
              <Link
                href="/employers"
                className="wa-inline-flex wa-items-center wa-px-6 wa-py-3 wa-border wa-border-[rgba(173,44,77,0.5)] wa-text-[#ffb2bc] wa-rounded-xl wa-font-semibold wa-no-underline hover:wa-bg-[rgba(173,44,77,0.1)] wa-transition-colors"
              >
                Employer Info
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
