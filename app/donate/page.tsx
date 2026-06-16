import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import LocalizedLink from '@/components/LocalizedLink';
import { HeroSection, InfoCard, PageSection, SectionHeader, QuoteCard } from '@/components/marketing/ui';
import { marketingButtonPresets, marketingPrimaryButtonClasses, marketingSecondaryButtonClasses } from '@/lib/marketing/buttonClasses';

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
    },
    {
      title: 'Corporate or organizational giving',
      description: 'For sponsorships, matching gifts, workforce partnerships, or larger commitments, email us and we will coordinate the right path.',
    },
    {
      title: 'Alternative payment methods',
      description: 'Credit card, Cash App, and additional payment rails are being finalized. For now, email us and we will route your donation manually.',
    },
  ];

  return (
    <div className="inner-page donate-page">
      <HeroSection
        backgroundImage="/images/hero-people.webp"
        priority
        minHeight="min(100vh, 42rem)"
        overlayGradient="linear-gradient(135deg, rgba(18,20,22,0.94) 0%, rgba(18,20,22,0.76) 52%, rgba(173,44,77,0.26) 100%)"
        eyebrow={
          <span
            style={{
              display: 'inline-block',
              padding: '0.375rem 0.9rem',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: 'var(--color-gold)',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Support WorkforceAP
          </span>
        }
        headline={
          <h1
            style={{
              margin: 0,
              color: 'var(--color-white)',
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              fontSize: 'clamp(2.4rem, 7vw, 4.75rem)',
              maxWidth: '14ch',
              textWrap: 'balance',
            }}
          >
            Fund real training, real support, and real job outcomes
          </h1>
        }
        subheadline={
          <p
            style={{
              margin: 0,
              maxWidth: '42rem',
              color: 'rgba(245, 245, 248, 0.9)',
              fontSize: 'clamp(1rem, 1.25vw, 1.2rem)',
              lineHeight: 1.7,
              textShadow: '0 1px 2px rgba(0,0,0,0.22)',
            }}
          >
            Your donation helps low-income adults access training, career support, and employer-connected pathways that move people toward work.
          </p>
        }
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem' }}>
          <a
            href={`mailto:${DONATION_EMAIL}?subject=WorkforceAP%20donation%20inquiry`}
            className={marketingButtonPresets.heroPrimary()}
            style={{ display: 'inline-flex' }}
          >
            Start a donation by email
          </a>
          <LocalizedLink
            href="/contact?topic=partnership"
            className={marketingButtonPresets.heroSecondaryOnDark()}
            style={{ display: 'inline-flex' }}
          >
            Talk about corporate giving
          </LocalizedLink>
        </div>
      </HeroSection>

      <PageSection>
        <SectionHeader
          eyebrow="What your donation funds"
          title="Donations support the work around access, training, and placement"
          subtitle="WorkforceAP is building a workforce engine for people who need a real shot at a better job. Donations help fund the member support and operational work that makes that possible."
          align="left"
        />
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            marginTop: '1.5rem',
          }}
        >
          <InfoCard
            title="Training access"
            description="Support the systems, guidance, and coordination that help qualified members start and stay in career training."
            variant="bordered"
          />
          <InfoCard
            title="Career readiness"
            description="Help fund resume support, interview prep, accountability, and the human follow-through that keeps members moving."
            variant="bordered"
          />
          <InfoCard
            title="Employer-connected outcomes"
            description="Support the employer outreach, operations, and placement work that turn training into hiring opportunities."
            variant="bordered"
          />
        </div>
      </PageSection>

      <PageSection style={{ borderTop: '1px solid rgba(88,65,68,0.1)' }}>
        <SectionHeader
          eyebrow="Suggested amounts"
          title="Simple giving suggestions"
          subtitle="These are guidance points to make giving easier. If you want to give at another level, email us and we will make it work."
          align="left"
        />
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            marginTop: '1.5rem',
          }}
        >
          {suggestedAmounts.map((item) => (
            <article key={item.amount} className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
              <p style={{ margin: 0, color: 'var(--color-accent)', fontWeight: 800, fontSize: '1.75rem' }}>{item.amount}</p>
              <h3 style={{ margin: '0.6rem 0 0.5rem', fontSize: '1.1rem', color: 'var(--color-on-surface)' }}>{item.title}</h3>
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.65 }}>{item.description}</p>
            </article>
          ))}
        </div>
      </PageSection>

      <PageSection style={{ borderTop: '1px solid rgba(88,65,68,0.1)' }}>
        <SectionHeader
          eyebrow="How to give right now"
          title="Email us to start the donation"
          subtitle="Public payment rails are being finalized. Until card, Cash App, and other donation methods are live, email us and we will coordinate the donation manually."
          align="left"
        />
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            marginTop: '1.5rem',
          }}
        >
          {givingOptions.map((item) => (
            <InfoCard key={item.title} title={item.title} description={item.description} variant="bordered" />
          ))}
        </div>

        <div className="portal-card portal-card--flat" style={{ marginTop: '1.5rem', padding: 'clamp(1.25rem, 3vw, 2rem)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--color-on-surface)' }}>Donation contact</h3>
          <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>
            Email{' '}
            <a href={`mailto:${DONATION_EMAIL}?subject=WorkforceAP%20donation%20inquiry`} style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
              {DONATION_EMAIL}
            </a>{' '}
            and tell us whether you are giving as an individual, company, foundation, or other organization.
          </p>
          <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>
            If you want to talk first, call <a href="tel:+15127771808" style={{ color: 'inherit' }}>{DONATION_PHONE}</a>.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
            <a
              href={`mailto:${DONATION_EMAIL}?subject=WorkforceAP%20donation%20inquiry`}
              className={marketingPrimaryButtonClasses()}
              style={{ display: 'inline-flex' }}
            >
              Email about donating
            </a>
            <LocalizedLink
              href="/contact?topic=partnership"
              className={marketingSecondaryButtonClasses()}
              style={{ display: 'inline-flex' }}
            >
              Contact the team
            </LocalizedLink>
          </div>
        </div>
      </PageSection>

      <PageSection style={{ borderTop: '1px solid rgba(88,65,68,0.1)' }}>
        <QuoteCard
          label="Workforce Advancement Project"
          quote="Workforce Advancement Project is a 501(c)(3) nonprofit. EIN: 41-2612389. Contributions are intended to support WorkforceAP's mission and may be tax-deductible to the extent allowed by law."
        />
      </PageSection>

      <Footer />
      <MobileBottomNav />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
