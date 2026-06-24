import '@/css/marketing-v3-donate.css';
import type { Metadata } from 'next';
import Image from 'next/image';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import LocalizedLink from '@/components/LocalizedLink';
import { MARKETING_FULL_BLEED_HERO_SIZES } from '@/lib/marketing/heroImage';

const DONATION_EMAIL = 'info@workforceap.org';
const DONATION_PHONE = '(512) 777-1808';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Donate to WorkforceAP',
    description:
      'Support Workforce Advancement Project with individual, corporate, or foundation giving. See what donations fund, suggested amounts, and how to start a contribution.',
    path: '/donate',
  });
}

export default function DonatePage() {
  const suggestedAmounts = [
    {
      amount: '$25',
      title: 'Member basics',
      description: 'Helps cover job-search materials, communications, and small support costs that keep a member moving.',
    },
    {
      amount: '$100',
      title: 'Career readiness support',
      description: 'Helps fund resume help, interview preparation, and advisor time for a member working toward placement.',
    },
    {
      amount: '$250',
      title: 'Training momentum',
      description: 'Supports the operational work around training access, accountability, and member follow-through.',
    },
    {
      amount: '$1,000+',
      title: 'Cohort and employer pipeline support',
      description: 'Helps WorkforceAP expand member support, employer engagement, and the systems that turn training into job outcomes.',
    },
  ];

  const givingOptions = [
    {
      title: 'Individual giving',
      description: 'If you want to help one member keep moving toward a better job, this is the fastest way to support the mission.',
      iconClass: 'wa-ic--accent',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      ),
    },
    {
      title: 'Corporate or organizational giving',
      description: 'For sponsorships, matching gifts, workforce partnerships, or larger commitments, email us and we will coordinate the right path.',
      iconClass: 'wa-ic--info',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 21h18M5 21V8l7-5 7 5v13" />
          <path d="M9 21v-6h6v6" />
        </svg>
      ),
    },
    {
      title: 'Alternative payment methods',
      description: 'Credit card, Cash App, and additional payment rails are being finalized. For now, email us and we will route your donation manually.',
      iconClass: 'wa-ic--gold',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      ),
    },
  ];

  const fundsCards = [
    {
      title: 'Training access',
      description: 'Support the systems, guidance, and coordination that help qualified members start and stay in career training.',
      iconClass: 'wa-ic--info',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M22 10L12 5 2 10l10 5 10-5z" />
          <path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" />
        </svg>
      ),
    },
    {
      title: 'Career readiness',
      description: 'Help fund resume support, interview prep, accountability, and the human follow-through that keeps members moving.',
      iconClass: 'wa-ic--accent',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M9 13l2 2 4-4" />
        </svg>
      ),
    },
    {
      title: 'Employer-connected outcomes',
      description: 'Support the employer outreach, operations, and placement work that turn training into hiring opportunities.',
      iconClass: 'wa-ic--gold',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="wa-v3 inner-page donate-page">
      {/* ===== HERO: real next/image photo behind crimson gradient ===== */}
      <header className="wa-dhero">
        <div className="wa-dhero-photo" aria-hidden="true">
          <Image
            src="/images/hero-people.webp"
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes={MARKETING_FULL_BLEED_HERO_SIZES}
            quality={85}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>
        <div className="wa-wrap">
          <div className="wa-dhero-inner">
            <span className="wa-ribbon">Support WorkforceAP</span>
            <h1>Fund real training, real support, and real job outcomes</h1>
            <p>
              Your donation helps low-income adults access training, career support, and employer-connected pathways that
              move people toward work.
            </p>
            <div className="wa-hero-actions">
              <a
                href={`mailto:${DONATION_EMAIL}?subject=WorkforceAP%20donation%20inquiry`}
                className="wa-btn wa-btn--light"
              >
                Start a donation by email
              </a>
              <LocalizedLink href="/contact?topic=partnership" className="wa-btn wa-btn--outline">
                Talk about corporate giving
              </LocalizedLink>
            </div>
          </div>
        </div>
      </header>

      {/* ===== WHAT YOUR DONATION FUNDS ===== */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">What your donation funds</span>
            <h2>Donations support the work around access, training, and placement</h2>
            <p>
              WorkforceAP is building a workforce engine for people who need a real shot at a better job. Donations help
              fund the member support and operational work that makes that possible.
            </p>
          </div>
          <div className="wa-pgrid">
            {fundsCards.map((card) => (
              <article key={card.title} className="wa-pcard">
                <div className={`wa-ic ${card.iconClass}`}>{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SUGGESTED AMOUNTS ===== */}
      <section className="wa-band wa-band--surface">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">Suggested amounts</span>
            <h2>Simple giving suggestions</h2>
            <p>
              These are guidance points to make giving easier. If you want to give at another level, email us and we will
              make it work.
            </p>
          </div>
          <div className="wa-agrid">
            {suggestedAmounts.map((item) => (
              <article key={item.amount} className="wa-amtcard">
                <div className="wa-amt">{item.amount}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW TO GIVE RIGHT NOW ===== */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">How to give right now</span>
            <h2>Email us to start the donation</h2>
            <p>
              Public payment rails are being finalized. Until card, Cash App, and other donation methods are live, email
              us and we will coordinate the donation manually.
            </p>
          </div>
          <div className="wa-pgrid">
            {givingOptions.map((item) => (
              <article key={item.title} className="wa-pcard">
                <div className={`wa-ic ${item.iconClass}`}>{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>

          <div className="wa-contact">
            <h3>Donation contact</h3>
            <p>
              Email{' '}
              <a href={`mailto:${DONATION_EMAIL}?subject=WorkforceAP%20donation%20inquiry`} className="wa-link">
                {DONATION_EMAIL}
              </a>{' '}
              and tell us whether you are giving as an individual, company, foundation, or other organization.
            </p>
            <p>
              If you want to talk first, call{' '}
              <a href="tel:+15127771808" className="wa-link--plain">
                {DONATION_PHONE}
              </a>
              .
            </p>
            <div className="wa-acts">
              <a
                href={`mailto:${DONATION_EMAIL}?subject=WorkforceAP%20donation%20inquiry`}
                className="wa-btn wa-btn--primary"
              >
                Email about donating
              </a>
              <LocalizedLink href="/contact?topic=partnership" className="wa-btn wa-btn--ghost">
                Contact the team
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 501(c)(3) QUOTE ===== */}
      <section className="wa-band wa-band--trust">
        <div className="wa-wrap">
          <div className="wa-quote">
            <div className="wa-lab">Workforce Advancement Project</div>
            <p>
              Workforce Advancement Project is a 501(c)(3) nonprofit. EIN: 41-2612389. Contributions are intended to
              support WorkforceAP&apos;s mission and may be tax-deductible to the extent allowed by law.
            </p>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
