import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import { Handshake, Users, Award, ArrowRight, HelpCircle, Briefcase, Building2, Landmark, Heart } from 'lucide-react';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Partners',
  description:
    'Partner with WorkforceAP: employers hire talent, referral orgs send candidates, workforce boards align, funders support scale. Clear next steps for each.',
  path: '/partners',
});

const PARTNER_TYPES = [
  {
    icon: Briefcase,
    type: 'Employers',
    who: 'Companies hiring for IT, cyber, data, project management, healthcare, trades.',
    why: 'Access pre-screened, certified talent. Post jobs free or become a hiring partner for first access to cohorts.',
    nextStep: { text: 'Visit Employer Page', href: '/employers' },
  },
  {
    icon: Users,
    type: 'Referral & Community Orgs',
    who: 'Nonprofits, social services, churches, reentry programs, community centers.',
    why: 'Refer clients who need career training. We follow up within 24–48 hours. No cost to refer. You get updates when referred individuals complete programs.',
    nextStep: { text: 'Contact to Refer', href: '/contact?topic=partnership' },
  },
  {
    icon: Landmark,
    type: 'Workforce Boards & Agencies',
    who: 'Workforce Solutions, TWC, WIOA providers, government workforce programs.',
    why: 'Align your participants with employer-recognized certifications. We handle training and placement; you strengthen outcomes for your population.',
    nextStep: { text: 'Discuss Alignment', href: '/contact?topic=partnership' },
  },
  {
    icon: Heart,
    type: 'Supporters & Funders',
    who: 'Foundations, corporate giving, impact investors, individual donors.',
    why: 'Fund a model that works. Employer-aligned training, no participant debt, measurable job outcomes. We\'re launching in Austin and building toward expansion.',
    nextStep: { text: 'Learn How to Support', href: '/contact?topic=partnership' },
  },
];

export default function PartnersPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Partner With Us"
        subtitle="Different partners, different roles. Find yours and take the next step."
      />

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1400&q=80"
        label="Partnership"
        title="Building a Skilled Workforce Together"
        description="We partner with employers who hire, orgs who refer, workforce boards who align, and funders who scale. Each partnership type has a clear path."
      />

      <section className="content-section">
        <div className="container">
          <h2 className="section-title animate-on-scroll">What Kind of Partner Are You?</h2>
          <div className="partners-type-grid">
            {PARTNER_TYPES.map(({ icon: Icon, type, who, why, nextStep }) => (
              <div key={type} className="partners-type-card animate-on-scroll">
                <div className="partners-type-icon"><Icon size={28} className="text-current" /></div>
                <h3>{type}</h3>
                <p className="partners-type-who"><strong>You are:</strong> {who}</p>
                <p className="partners-type-why"><strong>Why partner:</strong> {why}</p>
                <Link href={nextStep.href} className="btn btn-outline btn-sm">
                  {nextStep.text} <ArrowRight size={16} style={{ marginLeft: '0.25rem' }} />
                </Link>
              </div>
            ))}
          </div>

          <h2 className="section-title animate-on-scroll" style={{ marginTop: '3rem' }}>How Referrals Work</h2>
          <div className="two-col" style={{ marginBottom: '3rem' }}>
            <div>
              <p>Referral partners send us candidates who may benefit from free career training. We reach out within 24–48 hours and walk them through the process.</p>
              <ul style={{ marginTop: '1rem', paddingLeft: '1.25rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Submit a referral via our contact form or partner portal</li>
                <li style={{ marginBottom: '0.5rem' }}>We contact the candidate within 24–48 hours</li>
                <li style={{ marginBottom: '0.5rem' }}>Accepted members receive training, certifications, and job placement support</li>
                <li>You receive updates when referred individuals complete programs</li>
              </ul>
            </div>
            <div>
              <p>Best referrals: motivated to finish training, interested in tech, healthcare, manufacturing, or trades. Currently serving Austin area; expanding over time.</p>
              <Link href="/contact?topic=partnership" className="link-arrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                Contact us to refer <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <h2 className="section-title animate-on-scroll" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '3rem' }}>
            <HelpCircle size={24} className="text-current" />
            Partner FAQ
          </h2>
          <div className="faq-list" style={{ maxWidth: '720px' }}>
            <details className="faq-item">
              <summary>Who can become a partner?</summary>
              <p>Employers, workforce development boards, community organizations, social service agencies, and educational institutions can partner with WorkforceAP to refer candidates or hire graduates.</p>
            </details>
            <details className="faq-item">
              <summary>Is there a cost to refer candidates?</summary>
              <p>No. Referrals are free. We welcome partners who want to connect individuals in their network with our free career training programs.</p>
            </details>
            <details className="faq-item">
              <summary>How do I refer someone?</summary>
              <p>Contact us at info@workforceap.org or (512) 777-1808 with the candidate&apos;s name and contact information. You can also use our contact form and select &quot;Partnership&quot; as the topic.</p>
            </details>
            <details className="faq-item">
              <summary>Can I hire WorkforceAP graduates?</summary>
              <p>Yes. We actively connect employers with job-ready graduates. Reach out to discuss your hiring needs and we can share candidate profiles and schedule introductions.</p>
            </details>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
