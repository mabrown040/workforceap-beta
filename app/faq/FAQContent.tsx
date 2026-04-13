'use client';

import { useState } from 'react';
import Link from 'next/link';

const categories = [
  { key: 'General Questions', icon: 'help_outline' },
  { key: 'Admissions', icon: 'how_to_reg' },
  { key: 'Cost & Funding', icon: 'payments' },
  { key: 'Programs & Training', icon: 'school' },
  { key: 'Job Placement', icon: 'work' },
  { key: 'For Members', icon: 'person' },
  { key: 'For Employers', icon: 'business' },
];

const faqData: Record<string, { q: string; a: string; link?: { text: string; href: string } }[]> = {
  'General Questions': [
    {
      q: 'What is Workforce Investment Project (WorkforceAP)?',
      a: 'Workforce Advancement Project (WorkforceAP) is a nonprofit that provides free, WIOA-aligned career training and certifications. We help individuals gain industry-recognized credentials and connect them with employers hiring for those roles.',
      link: { text: 'Learn About Our Mission', href: '/what-we-do' },
    },
    { q: 'Is it really free?', a: 'Yes — completely. No tuition, no application fee, no hidden costs, no textbooks to buy, and no certification exam fees. Our programs are funded through federal workforce grants, employer partnerships, and community support. You will never receive a bill from us.', link: { text: 'View Programs', href: '/programs' } },
    { q: 'Who qualifies?', a: "Most people who apply do qualify. You need to be 16 or older, a U.S. citizen or permanent resident, and have (or be working toward) a high school diploma or GED. We prioritize people who are unemployed, underemployed, or looking to change careers. If you're unsure whether you qualify, apply anyway — we'll let you know within 24–48 hours.", link: { text: 'Start Your Application', href: '/apply' } },
    { q: 'How long do programs take?', a: 'Most programs take 3–5 months at roughly 10 hours per week. Our Digital Literacy track is shorter at 6–7 weeks. Everything is designed so you can participate while working, parenting, or managing other commitments.', link: { text: 'View Programs', href: '/programs' } },
    { q: 'Can I talk to someone before I apply?', a: "Absolutely. If you have questions or just want to talk through whether this is a good fit, reach out. Our team responds within 24–48 hours and is happy to have a real conversation before you commit to anything.", link: { text: 'Contact Us', href: '/contact' } },
  ],
  Admissions: [
    { q: 'What if I\'m not technical?', a: "That's exactly who we built this for. Our programs start from zero — no coding background, no IT history, no prior tech experience required. We've helped career-changers, people re-entering the workforce, and adults who've never worked in tech land roles in IT, cybersecurity, and data analytics. What matters most is your commitment to showing up and finishing.", link: { text: 'Take the Career Quiz', href: '/find-your-path' } },
    { q: "What if I'm starting over?", a: "Starting over is one of the most common reasons people come to us. Whether you left a job, got laid off, are leaving a difficult situation, or are just ready for a different path — we work with you from where you are now. Your counselor will help you pick the right program, set a realistic pace, and stay on track through the whole process.", link: { text: 'Find Your Path', href: '/find-your-path' } },
    { q: 'What are the eligibility requirements?', a: 'To apply: (1) 16 years or older, (2) U.S. citizen or permanent resident, (3) high school diploma or GED (or in process), (4) committed to program completion, (5) willing to participate in job placement, (6) access to reliable internet and computer. We welcome applicants from all backgrounds — no prior tech experience needed.', link: { text: 'View All Programs', href: '/programs' } },
    { q: 'What happens after I apply?', a: "Here's what to expect: (1) You submit our online application — takes about 10 minutes. (2) We review it and follow up within 48 hours. (3) We schedule a brief call to understand your goals and answer your questions. (4) If it's a good fit, you get a start date and onboarding instructions. No test, no gatekeeping, no waiting months for a decision.", link: { text: 'Start Your Application', href: '/apply' } },
    { q: 'Is there an application fee?', a: 'No. Zero fees. We review your goals, confirm fit, and share next steps. No cost to apply, no cost to participate if you qualify.' },
    { q: 'When do programs start?', a: "Rolling basis. New programs start monthly or bi-weekly depending on the track. Once approved, we'll connect you with the next available start.", link: { text: 'See How It Works', href: '/how-it-works' } },
  ],
  'Cost & Funding': [
    { q: 'How much does the program cost?', a: 'Our programs are available at no cost to members. There are no hidden fees, textbook costs, or application charges. This is made possible through grants, employer partnerships, and community funding.', link: { text: 'View Programs', href: '/programs' } },
    { q: "What does 'qualifying' mean?", a: "16+, US citizen or permanent resident, unemployed or underemployed, household income under $60K — you likely qualify. We also consider special circumstances. Apply and we'll confirm within 24-48 hours.", link: { text: 'Check Your Eligibility', href: '/apply' } },
    { q: 'Do I need to pay anything back?', a: 'No. This is not a loan. Training is funded through grants and partnerships. There are no income-sharing agreements (ISAs), no loans, and no hidden costs. Ever.', link: { text: 'Read Success Stories', href: '/blog' } },
    { q: 'Are certification exam fees included?', a: 'Yes. Certification exam fees are covered for members. There are no out-of-pocket costs for exams when you complete the program through WorkforceAP.', link: { text: 'View Programs', href: '/programs' } },
  ],
  'Programs & Training': [
    { q: 'How long do programs take?', a: 'Most programs take 3–5 months at roughly 10 hours per week. Digital Literacy is shorter at 6–7 weeks. All programs are designed to be completed while working part-time or managing family responsibilities.', link: { text: 'View Program Details', href: '/programs' } },
    { q: 'Is this online?', a: "Yes. All training is delivered virtually — you can participate from home, a library, or anywhere with a reliable internet connection. You don't need to commute, relocate, or take time off work to attend. Some programs include optional in-person events and local career fairs if you want them.", link: { text: 'See Available Programs', href: '/programs' } },
    { q: 'Do I need a laptop?', a: "You need access to a computer and a reliable internet connection to participate. If you don't have a laptop, apply anyway — upon successfully completing a program, you may qualify for a refurbished laptop through our Loaner Laptop Program. We won't turn away a committed member over equipment.", link: { text: 'Learn About Support', href: '/what-we-do' } },
    { q: 'What certifications will I earn?', a: "You'll earn industry-recognized certificates from partners like Google, IBM, Microsoft, Amazon, and CompTIA. These are the same credentials employers hire against.", link: { text: 'View Certification Paths', href: '/salary-guide' } },
    { q: 'What if I fail a certification exam?', a: 'Many certification providers allow retakes. We work with you to prepare for exams and, when available, support retake options. Your counselor can help you understand the specific retake policy for your program.', link: { text: 'See How It Works', href: '/how-it-works' } },
  ],
  'Job Placement': [
    { q: 'Do you help members find jobs?', a: "Yes — job placement is a core part of what we do, not an afterthought. We provide resume building, interview prep, LinkedIn coaching, and direct connections to employers who are actively hiring for the roles you're training for. Most graduates secure employment within 3–6 months of certification.", link: { text: 'Explore Career Outcomes', href: '/salary-guide' } },
    { q: 'What kind of jobs will I qualify for?', a: 'Entry-level to mid-level roles in IT, cybersecurity, data analytics, project management, healthcare, and skilled trades. Starting salaries range from $38K to $145K depending on the program.', link: { text: 'See Salary Guide', href: '/salary-guide' } },
    { q: 'How soon after graduating can I get hired?', a: 'Many members begin applying during training. Most graduates secure employment within 3-6 months of certification.', link: { text: 'Read Career Tips', href: '/blog' } },
  ],
  'For Members': [
    { q: 'What support do I get during training?', a: 'You receive a dedicated counselor, access to our member portal with career readiness tools (resume help, interview practice), and job placement assistance from intake through your first job.', link: { text: 'Learn About Our Mission', href: '/what-we-do' } },
    { q: 'Is there a counselor or advisor assigned to me?', a: 'Yes. Each member is assigned a counselor who supports you from intake through job placement. Your counselor helps with program pacing, career goals, and connecting you to resources.', link: { text: 'Meet the Team', href: '/leadership' } },
    { q: 'Can I work while enrolled?', a: 'Yes. Programs are designed to be flexible for working adults. The 10-hour weekly commitment is manageable alongside most work schedules.', link: { text: 'Check Program Flexibility', href: '/programs' } },
    { q: 'What if I fall behind?', a: "Your counselor will work with you to adjust your pace. We're invested in your completion — not just your enrollment. Life happens, and we'll help you get back on track.", link: { text: 'Meet the Team', href: '/leadership' } },
    { q: 'Is this too good to be true?', a: "We get it — free training with job placement sounds skeptical. We're funded by grants, employer partnerships, and community support. Our success metric is your employment, not your tuition.", link: { text: 'Meet the Team', href: '/leadership' } },
  ],
  'For Employers': [
    { q: 'How do employer partnerships work?', a: 'We train and certify job-ready candidates in high-demand fields. Employers gain access to a pipeline of pre-vetted, certified talent at no recruitment cost. We handle training, you handle hiring.', link: { text: 'Partner With Us', href: '/partners' } },
    { q: 'What certifications do your graduates hold?', a: "Graduates earn industry-recognized certifications from Google, IBM, Microsoft, Amazon, and CompTIA. These are the same credentials you'd see on any qualified candidate's resume.", link: { text: 'View Programs', href: '/programs' } },
    { q: 'Can I refer someone from my community?', a: 'Yes. We serve communities nationwide. Refer anyone who could benefit — we intake, assess, and connect them with the right program. No harm in applying.', link: { text: 'Refer Someone', href: '/partners' } },
    { q: 'Is this legitimate?', a: "We're a registered nonprofit with real leadership — Michael Brown (PMP) has trained thousands through Goodwill, Austin Area Urban League, and other established organizations. We work with employers who hire our graduates.", link: { text: 'Partner With Us', href: '/partners' } },
  ],
};

const sidebarGroups = [
  { label: 'General Questions', keys: ['General Questions', 'Admissions', 'Cost & Funding'] },
  { label: 'For Members', keys: ['Programs & Training', 'Job Placement', 'For Members'] },
  { label: 'For Employers', keys: ['For Employers'] },
];

export default function FAQContent() {
  const [activeCategory, setActiveCategory] = useState('General Questions');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (q: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
  };

  return (
    <section className="content-section">
      <div className="container" style={{ maxWidth: 1200 }}>

        {/* Editorial 2-col grid */}
        <div className="faq-layout-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '3rem', alignItems: 'flex-start' }}>

          {/* ── Sidebar Nav ── */}
          <aside className="faq-sidebar" style={{ position: 'sticky', top: 'calc(var(--main-nav-layout-height) + 1rem)' }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {sidebarGroups.map((group) => (
                <div key={group.label} style={{ marginBottom: '1rem' }}>
                  <p style={{
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: 'var(--color-on-surface-variant)',
                    marginBottom: '0.5rem',
                    paddingLeft: '0.75rem',
                  }}>
                    {group.label}
                  </p>
                  {group.keys.map((key) => {
                    const cat = categories.find((c) => c.key === key);
                    if (!cat) return null;
                    const isActive = activeCategory === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveCategory(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          width: '100%',
                          padding: '0.625rem 0.75rem',
                          border: 'none',
                          borderRadius: '0.5rem',
                          background: isActive ? 'rgba(173,44,77,0.1)' : 'transparent',
                          color: isActive ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                          fontWeight: isActive ? 600 : 500,
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background-color 0.15s, color 0.15s',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">{cat.icon}</span>
                        {key}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Still need support? card */}
            <div style={{
              marginTop: '1rem',
              padding: '1.25rem',
              background: 'var(--surface-container-low)',
              borderRadius: '0.75rem',
              border: '1px solid var(--outline-variant)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-accent)', marginBottom: '0.5rem', display: 'block' }} aria-hidden="true">support_agent</span>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-on-surface)', marginBottom: '0.375rem' }}>Still need support?</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Our team responds within 24-48 hours.
              </p>
              <Link href="/contact" style={{
                display: 'block',
                textAlign: 'center',
                padding: '0.5rem',
                background: 'var(--color-accent)',
                color: '#fff',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}>
                Contact Us
              </Link>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <div>
            {/* For Employers accent banner */}
            {activeCategory === 'For Employers' && (
              <div style={{
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, rgba(173,44,77,0.12) 0%, rgba(173,44,77,0.04) 100%)',
                border: '1px solid rgba(173,44,77,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)' }} aria-hidden="true">handshake</span>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--color-on-surface)', fontSize: '0.95rem' }}>Employer Partnership Inquiries</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                    Looking to hire certified talent? <Link href="/partners" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>Learn about our partnership model &rarr;</Link>
                  </p>
                </div>
              </div>
            )}

            {/* Section heading */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }} aria-hidden="true">
                  {categories.find((c) => c.key === activeCategory)?.icon ?? 'help_outline'}
                </span>
                {activeCategory}
              </h2>
            </div>

            {/* Accordion items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {faqData[activeCategory]?.map((item) => {
                const isOpen = openItems.has(item.q);
                return (
                  <div
                    key={item.q}
                    style={{
                      background: 'var(--surface-container-low)',
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      border: '1px solid var(--outline-variant)',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(item.q)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '1.25rem 1.5rem',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'var(--color-on-surface)',
                        fontWeight: 600,
                        fontSize: '1rem',
                        gap: '1rem',
                      }}
                    >
                      <span>{item.q}</span>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '1.25rem',
                          color: 'var(--color-on-surface-variant)',
                          transition: 'transform 0.25s',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          flexShrink: 0,
                        }}
                       aria-hidden="true">
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: '0 1.5rem 1.25rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>
                        <p>{item.a}</p>
                        {item.link && (
                          <p style={{ marginTop: '1rem' }}>
                            <Link
                              href={item.link.href}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: 'var(--color-accent)',
                                fontWeight: 600,
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                              }}
                            >
                              {item.link.text}
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">arrow_forward</span>
                            </Link>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom CTA: "Didn't find your answer?" ── */}
        <div style={{
          marginTop: '4rem',
          padding: '3rem',
          borderRadius: '1rem',
          background: 'var(--surface-container-low)',
          border: '1px solid var(--outline-variant)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          alignItems: 'center',
        }} className="faq-bottom-cta-grid">
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>
              Didn&rsquo;t find your answer?
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '1.5rem', maxWidth: '28rem' }}>
              Our team is here to help. Reach out directly and we&rsquo;ll get back to you within 24-48 hours.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href="/contact" style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--color-accent)',
                color: '#fff',
                borderRadius: '0.5rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}>
                Contact Us
              </Link>
              <Link href="/apply" style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--surface-container-high)',
                color: 'var(--color-accent)',
                borderRadius: '0.5rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}>
                Apply Now
              </Link>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-container)',
            borderRadius: '0.75rem',
            aspectRatio: '4/3',
          }}>
            <div style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem', opacity: 0.3 }} aria-hidden="true">forum</span>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>We&rsquo;re here to help</p>
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .faq-layout-grid { grid-template-columns: 1fr !important; }
          .faq-sidebar { position: static !important; }
          .faq-bottom-cta-grid { grid-template-columns: 1fr !important; }
        }
      `}} />
    </section>
  );
}
