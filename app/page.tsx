import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Image from 'next/image';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import Footer from '@/components/Footer';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import StatsBar from '@/components/home/StatsBar';
import GraduateStoryCard from '@/components/home/GraduateStoryCard';
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
    { num: '01', title: 'Quiz', desc: '2-minute skill alignment quiz.' },
    { num: '02', title: 'Apply', desc: 'Simple 10-minute application.' },
    { num: '03', title: 'Interview', desc: 'Quick conversational screen.' },
    { num: '04', title: 'Enroll', desc: 'Acceptance and orientation.', highlight: true },
    { num: '05-09', title: 'Intensive Learning', desc: 'Certification-focused training, labs, and soft skills workshops over 12-24 weeks.', wide: true },
    { num: '10', title: 'Certify', desc: 'Earn industry-recognized badges.' },
    { num: '11', title: 'Hired', desc: "Direct connection to Austin's top employers.", gradient: true },
  ];

  const graduates = [
    { name: 'Samira', role: 'Cybersecurity Specialist', imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqfg2jEVctkN05xZHMYP2K7F7ll4cPMWNwfw6vjaH0f_kM7kEDbr4WWmQWgR3qOu5j-_Ngv6rO2PPL9FwKqmdzetxwZutMILHwNnFd94R_c1Z_oJV5TM1Y4RtKDEgozRF3akQa-e_8sXvhmZ2-0URd2yQYC5-s8DiY4trhv9B8GtSVCikIXrN4rVbzBXziqmExnyGs9i62a9JqYVaACeejegXxFjPjh8HICltqtRAqfFUspLU9LG3Jh0J170vuTf-RkTwBawrSuA', beforePay: '$15/hr', afterPay: '$38/hr' },
    { name: 'Marcus', role: 'Cloud Operations', imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmVP6bLtWBC7okj9uFDaOS-DAAWMz_xW1djtqv_p4_nfzsZ5hzUoXOus-j0xyTsjaTOCs2FPk52BoAzLuzFNxNrJ9Llqubk5f8F_xe8kvZ1_h7Y_GiaQ7tVPZ08yayRpTmxSe3a0CUWtkeFFZc6qwHOVYbuG4rdK84cZhxokYdG3S0RLNSIdE4SIxESxCvU647wHRlsUlC4nqurkkn2rMxJhu1-C-0pLYSVmhVlTqpdnouzV21TdH7hltTftTzUm-XdSJ82C8NgA', beforePay: '$17/hr', afterPay: '$42/hr' },
  ];

  return (
    <div className="homepage" style={{ backgroundColor: '#141313', color: '#e6e1e1' }}>
      {/* Hero */}
      <section style={{ padding: '6rem 1.5rem 5rem' }} className="md:wa-px-12">
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'grid', gap: '3rem', alignItems: 'center' }} className="lg:wa-grid-cols-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Enrollment badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(113, 51, 62, 0.2)', border: '1px solid rgba(88, 65, 68, 0.15)', padding: '0.375rem 1rem', borderRadius: '9999px', width: 'fit-content' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ad2c4d', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ffb2bc' }}>Now Enrolling in Austin, TX</span>
            </div>

            <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: '#e6e1e1' }}>
              Free Career Training <br />in{' '}
              <span style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundImage: 'linear-gradient(to right, #ad2c4d, #ffb2bc)' }}>
                Austin, TX
              </span>
            </h1>

            <p style={{ fontSize: '1.25rem', color: '#debfc2', maxWidth: '32rem', lineHeight: 1.6 }}>
              Empowering People. Advancing Futures. Start your new career journey today with tuition-free technical education.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <ExperimentedCtaLink
                experiment="home_apply_primary_cta"
                variants={[
                  { id: 'control', label: 'Apply Free — Takes 10 Minutes', className: 'btn btn-accent btn-large', href: '/apply' },
                  { id: 'urgency', label: 'Start your application now', className: 'btn btn-accent btn-large', href: '/apply' },
                ]}
              />
              <Link
                href="/programs"
                style={{
                  backgroundColor: '#2b2a2a',
                  color: '#e6e1e1',
                  padding: '1rem 2rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  fontSize: '1.125rem',
                  border: '1px solid rgba(88, 65, 68, 0.15)',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                View Programs
              </Link>
            </div>
          </div>

          {/* Hero image */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '-1rem', background: 'linear-gradient(to top right, rgba(173,44,77,0.2), transparent)', filter: 'blur(48px)', opacity: 0.5, borderRadius: '1rem' }} />
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD65jWnKMvhpi7gZvn3NPxVZhjuEg-g_PSoajA3WBzgAa3KIu7Ma4RjhVNEs-pzZCcllbVMrKLi9mttdV7qdkkcv4aSlDs8FcrO2jIXC2-tEaORKkg73nICIPCImsMkQAG6naYRstfeBLWpw_shT4dmNa4NZEl7aBRJIm3-OX9c0u9SNAq_S8Y6vCdqZiZ41iyeUxk1gwjYiprh_CPlH1qx16u_Xx0_yGc71-BRWhl6WSoIqvCrw-aosd11HiDl4fb4moeBpMQGCQ"
              alt="Modern high-tech classroom in Austin with diverse adult students collaborating"
              width={800}
              height={600}
              priority
              fetchPriority="high"
              style={{ position: 'relative', borderRadius: '0.75rem', width: '100%', height: 'auto', aspectRatio: '4/3', objectFit: 'cover', border: '1px solid rgba(88, 65, 68, 0.3)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
            />
            {/* Floating placement rate badge */}
            <div className="wa-hidden md:wa-block" style={{ position: 'absolute', bottom: '-1.5rem', right: '-1.5rem', backgroundColor: '#201f1f', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(88, 65, 68, 0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#ad2c4d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>✓</div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: '#debfc2', letterSpacing: '0.05em' }}>Placement Rate</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffb2bc' }}>84%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <StatsBar />

      {/* Partner Logos */}
      <section style={{ padding: '4rem 2rem', backgroundColor: '#141313' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#debfc2', marginBottom: '3rem' }}>
            Hiring &amp; Training Partners
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '3rem', opacity: 0.6 }} className="md:wa-gap-24">
            {['GOOGLE', 'IBM', 'AWS', 'COMPTIA', 'AT&T', 'COURSERA'].map((name) => (
              <div key={name} style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#e6e1e1' }}>{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Graduate Stories */}
      <section style={{ padding: '6rem 2rem', backgroundColor: '#1c1b1b' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#e6e1e1', marginBottom: '1rem' }}>Life-Changing Outcomes</h2>
              <p style={{ color: '#debfc2', maxWidth: '32rem' }}>Real graduates from the Austin area who transitioned into high-growth tech careers.</p>
            </div>
            <Link href="/find-your-path" style={{ color: '#ffb2bc', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              WHAT COULD YOU EARN? →
            </Link>
          </div>
          <div style={{ display: 'grid', gap: '2rem' }} className="md:wa-grid-cols-2">
            {graduates.map((g) => (
              <GraduateStoryCard key={g.name} {...g} />
            ))}
          </div>
        </div>
      </section>

      {/* Journey Bento Grid */}
      <section style={{ padding: '6rem 2rem', backgroundColor: '#141313' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#e6e1e1', marginBottom: '1rem' }}>The Journey to Tech</h2>
            <p style={{ color: '#debfc2' }}>Your 11-step path from zero to career-ready.</p>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }} className="sm:wa-grid-cols-2 lg:wa-grid-cols-4">
            {journeySteps.map((step) => {
              if (step.wide) {
                return (
                  <div key={step.num} className="lg:wa-col-span-2" style={{ backgroundColor: '#2b2a2a', padding: '2rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'rgba(173, 44, 77, 0.2)' }}>{step.num}</div>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.25rem' }}>{step.title}</h4>
                      <p style={{ fontSize: '0.875rem', color: '#debfc2' }}>{step.desc}</p>
                    </div>
                  </div>
                );
              }
              if (step.gradient) {
                return (
                  <div key={step.num} style={{ background: 'linear-gradient(to bottom right, #ad2c4d, #670024)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                    <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>{step.num}</div>
                    <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'white' }}>{step.title}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>{step.desc}</p>
                  </div>
                );
              }
              return (
                <div
                  key={step.num}
                  style={{
                    backgroundColor: step.highlight ? 'rgba(173, 44, 77, 0.1)' : '#1c1b1b',
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    border: step.highlight ? '1px solid rgba(173, 44, 77, 0.3)' : '1px solid rgba(88, 65, 68, 0.1)',
                  }}
                >
                  <div style={{ fontSize: '2.25rem', fontWeight: 900, color: step.highlight ? '#ad2c4d' : 'rgba(173, 44, 77, 0.2)', marginBottom: '1rem' }}>{step.num}</div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{step.title}</h4>
                  <p style={{ fontSize: '0.875rem', color: step.highlight ? '#ffb2bc' : '#debfc2' }}>{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Email Capture */}
      <EmailCaptureWidget />

      {/* Footer */}
      <footer style={{ backgroundColor: '#141313', borderTop: '1px solid rgba(88, 65, 68, 0.15)' }}>
        <div style={{ display: 'grid', gap: '3rem', padding: '4rem 3rem', maxWidth: '80rem', margin: '0 auto' }} className="md:wa-grid-cols-3">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 900, color: '#e6e1e1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>WorkforceAP</div>
            <p style={{ fontSize: '0.875rem', color: '#debfc2', lineHeight: 1.7 }}>
              Bridging the opportunity gap in Austin through world-class technical training and direct employer pipelines.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#ffb2bc' }}>Explore</h4>
            <Link href="/programs" style={{ color: '#debfc2', textDecoration: 'none', fontSize: '0.875rem' }}>Programs</Link>
            <Link href="/blog" style={{ color: '#debfc2', textDecoration: 'none', fontSize: '0.875rem' }}>Graduate Stories</Link>
            <Link href="/partners" style={{ color: '#debfc2', textDecoration: 'none', fontSize: '0.875rem' }}>Partner Network</Link>
            <Link href="/privacy" style={{ color: '#debfc2', textDecoration: 'none', fontSize: '0.875rem' }}>Privacy Policy</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#ffb2bc' }}>Connect</h4>
            <Link href="/contact" style={{ color: '#debfc2', textDecoration: 'none', fontSize: '0.875rem' }}>Contact Us</Link>
            <a href="https://www.linkedin.com/company/workforce-advancement-project" target="_blank" rel="noopener noreferrer" style={{ color: '#debfc2', textDecoration: 'none', fontSize: '0.875rem' }}>LinkedIn</a>
          </div>
        </div>
        <div style={{ padding: '2rem 3rem', textAlign: 'center', borderTop: '1px solid rgba(88, 65, 68, 0.15)' }}>
          <p style={{ fontSize: '0.75rem', color: '#584144' }}>&copy; {new Date().getFullYear()} WorkforceAP Austin. All rights reserved.</p>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />

      {/* Pulse animation keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }` }} />
    </div>
  );
}
