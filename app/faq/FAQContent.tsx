'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClipboardList, DollarSign, GraduationCap, Briefcase, Clock, ArrowRight, BookOpen, Calendar, HelpCircle, Shield, Users } from 'lucide-react';

const categories = [
  { key: 'Admissions', Icon: ClipboardList },
  { key: 'Cost & Funding', Icon: DollarSign },
  { key: 'Programs & Training', Icon: GraduationCap },
  { key: 'Job Placement', Icon: Briefcase },
  { key: 'Schedule & Commitment', Icon: Clock },
  { key: 'Support & Resources', Icon: HelpCircle },
  { key: 'Common Concerns', Icon: Shield },
  { key: 'For Families & Partners', Icon: Users },
];

const faqData: Record<string, { q: string; a: string; link?: { text: string; href: string } }[]> = {
  Admissions: [
    { q: 'What are the eligibility requirements?', a: 'To apply: (1) 16 years or older, (2) U.S. citizen or permanent resident, (3) high school diploma or GED (or in process), (4) committed to program completion, (5) willing to participate in job placement, (6) access to reliable internet and computer. We welcome applicants from all backgrounds — no prior tech experience needed. Currently we serve the Austin area; we\'re expanding over time.', link: { text: 'View All Programs', href: '/programs' } },
    { q: 'Do I need prior tech experience to apply?', a: "No. Our programs are built for beginners. We've trained career-changers, unemployed workers, and people with zero tech experience. We start with fundamentals. The main thing we look for is commitment to learning and finishing.", link: { text: 'Take the Career Quiz', href: '/find-your-path' } },
    { q: 'What is the application process?', a: "Simple: (1) Fill out our online form with your info and program interest, (2) We review within 48 hours, (3) We schedule a brief call to discuss your goals and answer questions, (4) You get your start date and onboarding. No test, no gatekeeping — we use the application to help you, not to screen you out. Typically 5–7 business days.", link: { text: 'Start Your Application', href: '/apply' } },
    { q: 'Is there an application fee?', a: 'No. Zero fees. We review your goals, confirm fit, and share next steps. No cost to apply, no cost to participate if you qualify.' },
    { q: 'When do programs start?', a: "Rolling basis. New programs start monthly or bi-weekly depending on the track. Once approved, we'll connect you with the next available start. You can also wait for a later cohort if that fits better.", link: { text: 'See How It Works', href: '/how-it-works' } },
  ],
  'Cost & Funding': [
    { q: 'How much does the program cost?', a: 'Our programs are available at no cost to members. There are no hidden fees, textbook costs, or application charges. This is made possible through grants, employer partnerships, and community funding.', link: { text: 'Compare All Programs', href: '/program-comparison' } },
    { q: "What does 'qualifying' mean?", a: "16+, US citizen or permanent resident, unemployed or underemployed, household income under $60K — you likely qualify. We also consider special circumstances. Apply and we'll confirm within 24–48 hours. Currently serving the Austin area; we're expanding.", link: { text: 'Check Your Eligibility', href: '/apply' } },
    { q: 'Do I need to pay anything back?', a: 'No. This is not a loan. Training is funded through grants and partnerships. There are no income-sharing agreements (ISAs), no loans, and no hidden costs. Ever.', link: { text: 'Read Success Stories', href: '/blog' } },
    { q: 'Are certification exam fees included?', a: 'Yes. Certification exam fees are covered for members. There are no out-of-pocket costs for exams when you complete the program through WorkforceAP.', link: { text: 'View Programs', href: '/programs' } },
  ],
  'Programs & Training': [
    { q: 'How long are the programs?', a: 'Most programs take 3–5 months at 10 hours per week. Digital Literacy is shorter at 6–7 weeks. All programs are designed to be completed while working part-time or managing family responsibilities.', link: { text: 'View Program Details', href: '/programs' } },
    { q: 'Are programs online or in person?', a: 'Virtual and hybrid — you can complete training from home with an internet connection. Some programs offer optional in-person events and career fairs. Currently concentrated in the Austin area; format may vary as we expand.', link: { text: 'See Available Programs', href: '/programs' } },
    { q: 'Do I need my own computer?', a: 'Access to a computer and internet is required to participate. Upon successful program completion, you may earn a refurbished laptop through our Loaner Laptop Program, ensuring you have the tools needed for your new career.', link: { text: 'Learn About Support', href: '/what-we-do' } },
    { q: 'Can I use a tablet or phone instead of a computer?', a: 'No. Programs require a laptop or desktop computer with a keyboard for coursework, labs, and certification exams. Tablets and phones are not sufficient. If you don\'t have access to a computer, ask about our Loaner Laptop Program during intake — we may be able to help.', link: { text: 'View Programs', href: '/programs' } },
    { q: 'What certifications will I earn?', a: "You'll earn industry-recognized certificates from partners like Google, IBM, Microsoft, Amazon, and CompTIA. These are the same credentials employers hire against — not generic 'certificates of completion.'", link: { text: 'View Certification Paths', href: '/salary-guide' } },
    { q: 'What if I fail a certification exam?', a: 'Many certification providers allow retakes. We work with you to prepare for exams and, when available, support retake options. Your counselor can help you understand the specific retake policy for your program and create a study plan.', link: { text: 'See How It Works', href: '/how-it-works' } },
  ],
  'Job Placement': [
    { q: 'Will you help me find a job?', a: 'Yes. We provide 100% job search support including resume building, interview prep, and connections to employers hiring for your role. Our employer network includes companies actively seeking our graduates.', link: { text: 'Explore Career Outcomes', href: '/salary-guide' } },
    { q: 'What kind of jobs will I qualify for?', a: 'Entry-level to mid-level roles in IT, cybersecurity, data analytics, project management, healthcare, and skilled trades. Starting salaries range from $38K to $145K depending on the program. Many graduates see significant salary increases within 2–3 years.', link: { text: 'See Salary Guide', href: '/salary-guide' } },
    { q: 'How soon after graduating can I get hired?', a: 'Many members begin applying during training. Job placement timelines vary, but our team works with you from day one of training through your first hire. Most graduates secure employment within 3–6 months of certification.', link: { text: 'Read Career Tips', href: '/blog' } },
    { q: 'Does job placement assistance guarantee a job?', a: 'We cannot guarantee employment, but we provide resume support, interview prep, employer introductions, and job search guidance. Our graduates have strong outcomes because we prepare you for the hiring process and connect you with employers who value our certifications.', link: { text: 'See Salary Guide', href: '/salary-guide' } },
  ],
  'Schedule & Commitment': [
    { q: 'How many hours per week?', a: 'Most programs require about 10 hours per week. You can train around a part-time job or family schedule. We recommend setting aside dedicated study time to stay on track.', link: { text: 'See Full Process', href: '/how-it-works' } },
    { q: 'Can I work while enrolled?', a: 'Yes. Programs are designed to be flexible for working adults. Many of our successful graduates worked part-time while completing their training. The 10-hour weekly commitment is manageable alongside most work schedules.', link: { text: 'Check Program Flexibility', href: '/programs' } },
    { q: 'Can I work full-time during the program?', a: 'Yes. Many members work full-time and complete training in the evenings or on weekends. The 10-hour weekly commitment is designed to fit around work. If your schedule is very demanding, we can discuss pacing options during intake.', link: { text: 'See How It Works', href: '/how-it-works' } },
    { q: 'What if I fall behind?', a: "Your counselor will work with you to adjust your pace. We're invested in your completion — not just your enrollment. Life happens, and we'll help you get back on track if you need to pause or slow down.", link: { text: 'Meet the Team', href: '/leadership' } },
  ],
  'Support & Resources': [
    { q: 'What support do I get during training?', a: 'You receive a dedicated counselor, access to our member portal with AI tools (resume help, interview practice), career readiness resources, and job placement assistance. We also offer a loaner laptop upon successful completion for those who need one.', link: { text: 'Learn About Our Mission', href: '/what-we-do' } },
    { q: 'Is there a counselor or advisor assigned to me?', a: 'Yes. Each member is assigned a counselor who supports you from intake through job placement. Your counselor helps with program pacing, career goals, and connecting you to resources.', link: { text: 'Meet the Team', href: '/leadership' } },
    { q: 'Can I get a loaner laptop if I don\'t have a computer?', a: 'Loaner laptops are typically awarded upon successful program completion. If you lack computer access and it would prevent you from participating, discuss this during your intake call — we may have limited options to support you earlier.', link: { text: 'Learn About Support', href: '/what-we-do' } },
    { q: 'How do partner referrals work?', a: 'Community partners, employers, and service providers can refer individuals to WorkforceAP. If you were referred, you follow the same application process — we reach out within 24–48 hours. Referrals don\'t guarantee acceptance, but we prioritize timely follow-up.', link: { text: 'Learn About Partners', href: '/partners' } },
  ],
  'Common Concerns': [
    { q: 'Is this too good to be true?', a: 'We get it — free training with job placement sounds skeptical. Here\'s the deal: we\'re funded by grants, employer partnerships, and community support. Our success metric is your employment, not your tuition. We don\'t profit from your enrollment; we profit when you land a job. Check our leadership page — these are real people with decades of workforce experience.', link: { text: 'Meet the Team', href: '/leadership' } },
    { q: 'How do you make money if training is free?', a: 'We\'re a nonprofit. Funding comes from grants, employer partnerships (they pay for talent pipeline access), and community funders. We don\'t charge participants. Our revenue is from organizations that want trained, certified workers — not from you.', link: { text: 'See How It Works', href: '/how-it-works' } },
    { q: 'I\'ve been burned by programs before. Why should I trust this?', a: 'Fair concern. We\'re transparent: no loans, no ISAs, no hidden costs. You can walk away anytime. Our leadership has 25+ years in workforce development — Goodwill, Urban League, consulting. This isn\'t a fly-by-night operation. Talk to us before you commit: (512) 777-1808.', link: { text: 'Meet the Team', href: '/leadership' } },
    { q: 'What if I\'m not tech-savvy?', a: 'Many of our best graduates started with zero tech experience. We have programs from Digital Literacy (basics) to advanced certifications. The pathfinder quiz helps match you to the right level. Don\'t self-select out — let us help you find the fit.', link: { text: 'Take the Pathfinder Quiz', href: '/find-your-path' } },
  ],
  'For Families & Partners': [
    { q: 'My family member is considering this. What should I know?', a: 'WorkforceAP provides no-cost career training with job placement support. No loans, no debt, no income-sharing agreements. Programs run 6 weeks to 6 months, mostly online. We assign a counselor and provide resources like resume help and interview prep. You\'re welcome to join an info call with them — we encourage family support.', link: { text: 'See How It Works', href: '/how-it-works' } },
    { q: 'As a partner, how do I know this is legitimate?', a: 'We\'re a registered nonprofit with real leadership — Michael Brown (PMP) has trained thousands through Goodwill, Austin Area Urban League, and other established organizations. We work with employers who hire our graduates. Refer your clients with confidence; we follow up within 24–48 hours and don\'t charge referrals.', link: { text: 'Partner With Us', href: '/partners' } },
    { q: 'Can I refer someone who lives outside Austin?', a: 'We\'re currently serving the Austin area as our launch community. We\'re building toward expansion. You can still refer — we\'ll intake, assess, and keep them in the loop for when we expand. No harm in applying.', link: { text: 'Refer Someone', href: '/partners' } },
  ],
};

const quickLinks = [
  { title: 'Browse Programs', href: '/programs', icon: BookOpen },
  { title: 'Compare Options', href: '/program-comparison', icon: ArrowRight },
  { title: 'Salary Guide', href: '/salary-guide', icon: DollarSign },
  { title: 'Career Quiz', href: '/find-your-path', icon: ClipboardList },
];

export default function FAQContent() {
  const [activeCategory, setActiveCategory] = useState('Admissions');

  return (
    <section
      className="content-section"
      style={{ backgroundColor: 'transparent', color: '#e6e1e1', padding: 0 }}
    >
      <div className="container" style={{ maxWidth: '100%', padding: 0 }}>
        {/* Last Updated Badge */}
        <div
          className="faq-updated-badge"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '1.5rem',
            color: '#a68a8d',
            fontSize: '0.875rem',
          }}
        >
          <Calendar size={16} aria-hidden />
          <span>Last updated: March 28, 2026</span>
          <span style={{ marginLeft: 'auto' }}>
            <Link href="/contact" style={{ color: '#ad2c4d', textDecoration: 'none' }}>
              Suggest an update →
            </Link>
          </span>
        </div>

        {/* Quick Links */}
        <div
          className="faq-quick-links"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '2rem',
          }}
        >
          {quickLinks.map(({ title, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="faq-quick-link"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#e6e1e1',
                textDecoration: 'none',
                fontSize: '0.9rem',
                transition: 'border-color 0.15s',
              }}
            >
              <Icon size={20} style={{ color: '#ad2c4d' }} aria-hidden />
              <span style={{ fontWeight: 500 }}>{title}</span>
              <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.4 }} aria-hidden />
            </Link>
          ))}
        </div>

        {/* Category Tabs */}
        <div
          className="faq-category-tabs"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '2rem',
          }}
        >
          {categories.map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: activeCategory === key ? '1px solid #ad2c4d' : '1px solid rgba(255,255,255,0.1)',
                background: activeCategory === key ? 'rgba(173,44,77,0.12)' : 'rgba(255,255,255,0.03)',
                color: activeCategory === key ? '#ffb2bc' : '#debfc2',
                fontWeight: activeCategory === key ? 600 : 400,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={16} aria-hidden />
              {key}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        {categories.map(({ key, Icon }) => (
          <div
            key={key}
            className="faq-section"
            style={{ display: activeCategory === key ? 'block' : 'none' }}
          >
            <h2
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#ad2c4d',
                fontSize: '1.1rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1.25rem',
              }}
            >
              <Icon size={20} aria-hidden />
              {key}
            </h2>
            <div className="faq-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {faqData[key]?.map((item) => (
                <details
                  key={item.q}
                  className="faq-item"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <summary
                    style={{
                      padding: '16px 20px',
                      cursor: 'pointer',
                      color: '#e6e1e1',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      listStyle: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    {item.q}
                    <span style={{ color: '#ad2c4d', fontSize: '1.25rem', lineHeight: 1 }}>+</span>
                  </summary>
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ color: '#debfc2', lineHeight: 1.7, marginTop: '14px', fontSize: '0.95rem' }}>{item.a}</p>
                    {item.link && (
                      <p style={{ marginTop: '1rem' }}>
                        <Link
                          href={item.link.href}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#ad2c4d',
                            fontWeight: 500,
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                          }}
                        >
                          {item.link.text} <ArrowRight size={14} />
                        </Link>
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}

        {/* CTA Section */}
        <div
          className="faq-bottom-cta"
          style={{
            marginTop: '3rem',
            background: 'rgba(173,44,77,0.08)',
            border: '1px solid rgba(173,44,77,0.2)',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: '#e6e1e1', fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
            Still have questions?
          </h2>
          <p style={{ color: '#debfc2', marginBottom: '24px' }}>
            Our team responds within 24–48 hours — reach out any time.
          </p>
          <Link
            href="/contact"
            className="btn btn-primary"
            style={{ marginRight: '1rem', background: '#ad2c4d', color: '#fff', borderRadius: '8px', padding: '12px 24px', fontWeight: 700, textDecoration: 'none' }}
          >
            Contact Us
          </Link>
          <Link
            href="/apply"
            style={{
              border: '1px solid rgba(173,44,77,0.5)',
              color: '#ffb2bc',
              borderRadius: '8px',
              padding: '12px 24px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Apply Now
          </Link>
        </div>
      </div>
    </section>
  );
}
