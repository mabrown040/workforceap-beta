import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, Clock, DollarSign, Award, CheckCircle, Users, BookOpen, Wrench, Terminal, GitBranch, Cloud, Zap, Star, TrendingUp, Shield, MapPin } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { buildOgImageUrl } from '@/lib/seo/siteEnvironment';
import { getProgramBySlug, getProgramDisplayTitle, getProgramDisplayPartner } from '@/lib/content/programs';
import { getProgramExtra } from '@/lib/content/programExtras';
import { salaryRangeDisplay } from '@/lib/content/programSalaryOutcomes';
import LocalizedLink from '@/components/LocalizedLink';
import JsonLdCourse from '@/components/JsonLdCourse';
import JsonLdBreadcrumb from '@/components/JsonLdBreadcrumb';
import JsonLdEducationalOccupationalProgram from '@/components/JsonLdEducationalOccupationalProgram';

const TARGET_SLUG = 'it-automation-with-python-google';

export async function generateMetadata(): Promise<Metadata> {
  const program = getProgramBySlug(TARGET_SLUG);
  if (!program) return { title: 'Program' };

  const displayTitle = getProgramDisplayTitle(program);
  const displayPartner = getProgramDisplayPartner(program);
  const salaryRange = salaryRangeDisplay(program);
  const description = `Free ${displayPartner} IT certification in Austin. ${program.duration}. Starting salary ${salaryRange}. WIOA-funded — apply at no cost. No experience required.`;
  const pageTitle = `${displayTitle} — Free Certification in Austin, TX`;

  return buildPageMetadataAsync({
    title: pageTitle,
    description,
    path: `/lp/google-it-automation`,
    image: buildOgImageUrl(pageTitle, description),
  });
}

export default function GoogleItAutomationLandingPage() {
  const program = getProgramBySlug(TARGET_SLUG);
  if (!program) notFound();

  const displayTitle = getProgramDisplayTitle(program);
  const displayPartner = getProgramDisplayPartner(program);
  const extra = getProgramExtra(TARGET_SLUG);
  const salaryRange = salaryRangeDisplay(program);

  // A/B headline variants — flip via query param ?v=a or ?v=b
  const headlineA = `Get a ${displayPartner} IT Certification at No Cost`;
  const headlineB = `Start an IT Career in Austin — Free ${displayPartner} Training`;

  // Social proof: suppressed until N≥3 real testimonials
  const testimonialCount = 0;
  const showSocialProof = testimonialCount >= 3;

  const applyUrl = `/apply?program=${TARGET_SLUG}`;

  return (
    <div className="inner-page lp-page">
      <JsonLdCourse program={program} />
      <JsonLdEducationalOccupationalProgram program={program} url={`https://www.workforceap.org/lp/google-it-automation`} />
      <JsonLdBreadcrumb
        items={[
          { name: 'Home', path: '/' },
          { name: displayTitle },
        ]}
        currentPath={`/lp/google-it-automation`}
      />

      {/* ── Hero: outcomes-focused, not catalog ── */}
      <section className="page-hero lp-hero" style={{ paddingBottom: '3rem' }}>
        <div className="page-hero-content" style={{ maxWidth: 720 }}>
          <span
            style={{
              background: program.categoryColor,
              color: 'white',
              padding: '0.3rem 0.75rem',
              borderRadius: '50px',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'inline-block',
              marginBottom: '0.75rem',
            }}
          >
            {program.categoryLabel}
          </span>
          {/* A/B scaffold: headline A is default, B is variant */}
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1.15, marginBottom: '0.75rem' }}>
            {headlineA}
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', maxWidth: 600 }}>
            WIOA-funded training in Austin. {program.duration}. No prior experience required. 
            Earn a {displayPartner}-recognized certificate and start working in IT automation.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <LocalizedLink
              href={applyUrl}
              className="btn btn-primary"
              style={{ fontSize: '1.05rem', padding: '0.85rem 1.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Apply Now <ArrowRight size={18} />
            </LocalizedLink>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
              Takes 3 minutes • No credit card required
            </span>
          </div>
        </div>
      </section>

      {/* ── Stats band: WIOA-eligibility language, no placeholder stats ── */}
      <section className="content-section" style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem', background: 'var(--surface-container-low)' }}>
        <div className="container">
          <div
            className="lp-stats-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '1.5rem',
              textAlign: 'center',
            }}
          >
            <div className="lp-stat">
              <Clock size={24} style={{ color: 'var(--color-accent)', marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{program.duration}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>Self-paced online</div>
            </div>
            <div className="lp-stat">
              <DollarSign size={24} style={{ color: 'var(--color-green)', marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{salaryRange}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>Starting salary range</div>
            </div>
            <div className="lp-stat">
              <Award size={24} style={{ color: 'var(--color-gold)', marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{displayPartner}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>Industry-recognized cert</div>
            </div>
            <div className="lp-stat">
              <Shield size={24} style={{ color: 'var(--color-blue)', marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>WIOA Eligible</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>No cost for qualifying members</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Course curriculum preview ── */}
      <section className="content-section">
        <div className="container" style={{ maxWidth: 800 }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>What You Will Learn</h2>
          <div
            className="lp-courses-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {program.courses.map((course, i) => {
              const icons = [BookOpen, Terminal, GitBranch, Wrench, Cloud, Zap];
              const Icon = icons[i % icons.length];
              return (
                <div
                  key={course.slug}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'var(--surface-container)',
                    border: '1px solid var(--outline-variant)',
                  }}
                >
                  <Icon size={20} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{course.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>
                      {course.estimatedHours} hours
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Job outcomes section with skills grid ── */}
      <section className="content-section" style={{ background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Job Outcomes</h2>
          {extra && (
            <div style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-on-surface-variant)' }}>
              <p style={{ marginBottom: '0.5rem' }}><strong>Best for:</strong> {extra.bestFor}</p>
              <p><strong>Ramp:</strong> {extra.rampNote}</p>
            </div>
          )}
          <div
            className="lp-skills-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem',
              marginBottom: '2rem',
            }}
          >
            {program.skills.map((skill) => (
              <div
                key={skill}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 0.9rem',
                  borderRadius: '50px',
                  background: 'var(--surface-container)',
                  border: '1px solid var(--outline-variant)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                <CheckCircle size={14} style={{ color: 'var(--color-green)' }} />
                {skill}
              </div>
            ))}
          </div>
          {extra && (
            <div
              className="lp-job-outcomes"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              {extra.jobOutcomes.map((job) => (
                <div
                  key={job}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'var(--surface-container)',
                    border: '1px solid var(--outline-variant)',
                    textAlign: 'center',
                  }}
                >
                  <TrendingUp size={20} style={{ color: 'var(--color-accent)', marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{job}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 4-step journey: Apply → Approved → Train → Hired ── */}
      <section className="content-section">
        <div className="container" style={{ maxWidth: 800 }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Your Journey</h2>
          <div
            className="lp-journey-steps"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1.5rem',
              textAlign: 'center',
            }}
          >
            {[
              { step: '1', label: 'Apply', desc: '3-minute application', icon: Users },
              { step: '2', label: 'Approved', desc: 'WIOA eligibility check', icon: CheckCircle },
              { step: '3', label: 'Train', desc: program.duration, icon: BookOpen },
              { step: '4', label: 'Hired', desc: 'Job placement support', icon: Star },
            ].map(({ step, label, desc, icon: Icon }) => (
              <div key={step} style={{ position: 'relative' }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    margin: '0 auto 0.75rem',
                  }}
                >
                  {step}
                </div>
                <Icon size={20} style={{ color: 'var(--color-accent)', marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof: suppressed until N≥3 testimonials ── */}
      {showSocialProof && (
        <section className="content-section" style={{ background: 'var(--surface-container-low)' }}>
          <div className="container" style={{ maxWidth: 800 }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Member Stories</h2>
            {/* Testimonials would render here when N≥3 */}
          </div>
        </section>
      )}

      {/* ── WIOA eligibility requirements ── */}
      <section className="content-section">
        <div className="container" style={{ maxWidth: 720 }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>WIOA Eligibility</h2>
          <div
            style={{
              background: 'var(--surface-container)',
              borderRadius: '16px',
              padding: '2rem',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <p style={{ marginBottom: '1.25rem', color: 'var(--color-on-surface-variant)' }}>
              This program is offered at no cost through Workforce Innovation and Opportunity Act (WIOA) funding for qualifying Texas residents. You may be eligible if you meet one or more of the following:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
              {[
                'Currently unemployed or underemployed',
                'Received a notice of layoff or termination',
                'Dislocated worker due to plant closure or trade impact',
                'Low-income individual facing barriers to employment',
                'Veteran or eligible spouse seeking career transition',
              ].map((item) => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--color-green)', flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
              Not sure if you qualify? Apply anyway — our counselors review every application and will guide you to the right pathway.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA band ── */}
      <section className="content-section" style={{ background: 'var(--color-accent)', color: 'white', padding: '3rem 1rem' }}>
        <div className="container" style={{ maxWidth: 600, textAlign: 'center' }}>
          <h2 style={{ color: 'white', marginBottom: '1rem' }}>Start Your IT Career Today</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '1.5rem', fontSize: '1.05rem' }}>
            Free {displayPartner} certification. WIOA-funded. Apply in 3 minutes.
          </p>
          <LocalizedLink
            href={applyUrl}
            className="btn"
            style={{
              background: 'white',
              color: 'var(--color-accent)',
              fontSize: '1.1rem',
              padding: '0.9rem 2rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              borderRadius: '50px',
            }}
          >
            Apply Now <ArrowRight size={20} />
          </LocalizedLink>
          <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
            <MapPin size={12} /> Austin, TX • Remote-friendly
          </div>
        </div>
      </section>

      {/* ── SEO footer: keyword reinforcement ── */}
      <section className="content-section" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="container" style={{ maxWidth: 720, textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', lineHeight: 1.6 }}>
            Workforce Advancement Project offers <strong>free Google IT certification in Austin</strong> through WIOA-funded career training programs. 
            Earn your Google IT Automation with Python Certificate at no cost. 
            Self-paced online courses with job placement support for Austin-area residents. 
            No prior experience required — apply today and start your IT career in Texas.
          </p>
        </div>
      </section>
    </div>
  );
}
