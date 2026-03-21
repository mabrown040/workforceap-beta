'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClipboardList, DollarSign, GraduationCap, Briefcase, Clock, ArrowRight, BookOpen, Calendar, HelpCircle } from 'lucide-react';

const categories = [
  { key: 'Admissions', Icon: ClipboardList },
  { key: 'Cost & Funding', Icon: DollarSign },
  { key: 'Programs & Training', Icon: GraduationCap },
  { key: 'Job Placement', Icon: Briefcase },
  { key: 'Schedule & Commitment', Icon: Clock },
  { key: 'Support & Resources', Icon: HelpCircle },
];

const faqData: Record<string, { q: string; a: string; link?: { text: string; href: string } }[]> = {
  Admissions: [
    { q: 'What are the eligibility requirements?', a: 'To apply to Workforce Advancement Project, you must be: (1) 16 years or older, (2) a U.S. citizen or permanent resident, (3) possess a high school diploma or GED or in process, (4) committed to 100% program completion, (5) willing to participate in job placement assistance services, and (6) have access to a reliable internet connection and computer. We welcome applicants from all backgrounds, including those with no prior tech experience.', link: { text: 'View All Programs', href: '/programs' } },
    { q: 'Do I need prior tech experience to apply?', a: "No! WorkforceAP programs are designed for beginners with no technical background. We start with fundamentals and build your skills progressively. We've successfully trained career-changers, unemployed workers, and students with zero tech experience. The most important thing is your commitment to learning and completing the program.", link: { text: 'Take the Career Quiz', href: '/find-your-path' } },
    { q: 'What is the application process?', a: "Our application process is straightforward: (1) Complete our online application form with your personal info and program interest, (2) Our admissions team reviews your application within 48 hours, (3) If you're a good fit, we'll schedule a brief intake call to discuss your goals, (4) Upon approval, you'll receive your start date and onboarding materials. The entire process typically takes 5–7 business days.", link: { text: 'Start Your Application', href: '/apply' } },
    { q: 'Is there an application fee?', a: 'There is no application fee. Once you apply, our admissions team reviews your goals, confirms program fit, and shares the next steps before your program begins.' },
    { q: 'When do programs start?', a: "We run programs on a rolling basis throughout the year. New programs typically start monthly, though some have start dates bi-weekly. Once you're approved, we'll connect you with the next available start date. You can also request to wait for a future program if timing works better for you.", link: { text: 'See How It Works', href: '/how-it-works' } },
  ],
  'Cost & Funding': [
    { q: 'How much does the program cost?', a: 'Our programs are available at no cost to qualifying participants. There are no hidden fees, textbook costs, or application charges. This is made possible through grants, employer partnerships, and community funding.', link: { text: 'Compare All Programs', href: '/program-comparison' } },
    { q: "What does 'qualifying' mean?", a: "If you are 16+, a US citizen or permanent resident, and unemployed or underemployed with household income under $60K, you likely qualify. Apply and we'll confirm within 24–48 hours. We also consider special circumstances on a case-by-case basis.", link: { text: 'Check Your Eligibility', href: '/apply' } },
    { q: 'Do I need to pay anything back?', a: 'No. This is not a loan. Training is funded through grants and partnerships. There are no income-sharing agreements (ISAs), no loans, and no hidden costs. Ever.', link: { text: 'Read Success Stories', href: '/blog' } },
    { q: 'Are certification exam fees included?', a: 'Yes. Certification exam fees are covered for qualifying participants. There are no out-of-pocket costs for exams when you complete the program through WorkforceAP.', link: { text: 'View Programs', href: '/programs' } },
  ],
  'Programs & Training': [
    { q: 'How long are the programs?', a: 'Most programs take 3–5 months at 10 hours per week. Digital Literacy is shorter at 6–7 weeks. All programs are designed to be completed while working part-time or managing family responsibilities.', link: { text: 'View Program Details', href: '/programs' } },
    { q: 'Are programs online or in person?', a: 'Programs are virtual and hybrid — you can complete training from home with an internet connection. Some programs offer optional in-person networking events and career fairs in the Austin area.', link: { text: 'See Available Programs', href: '/programs' } },
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
    { q: 'How do partner referrals work?', a: 'Community partners, employers, and service providers can refer individuals to WorkforceAP. If you were referred, you follow the same application process — we will reach out within 24–48 hours. Referrals do not guarantee acceptance, but we prioritize timely follow-up.', link: { text: 'Learn About Partners', href: '/partners' } },
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
    <section className="content-section">
      <div className="container">
        {/* Last Updated Badge */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          marginBottom: '1.5rem',
          padding: '0.75rem 1rem',
          background: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#666'
        }}>
          <Calendar size={16} />
          <span>Last updated: March 20, 2026</span>
          <span style={{ marginLeft: 'auto' }}>
            <Link href="/contact" style={{ color: '#ad2c4d', textDecoration: 'none' }}>
              Suggest an update →
            </Link>
          </span>
        </div>

        {/* Quick Links */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          marginBottom: '2.5rem' 
        }}>
          {quickLinks.map(({ title, href, icon: Icon }) => (
            <Link 
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                background: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: '10px',
                textDecoration: 'none',
                color: '#1a1a1a',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={20} style={{ color: '#ad2c4d' }} />
              <span style={{ fontWeight: 500 }}>{title}</span>
              <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
            </Link>
          ))}
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '2.5rem' }}>
          {categories.map(({ key, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: activeCategory === key ? '#ad2c4d' : '#f0f0f0',
                color: activeCategory === key ? 'white' : '#1a1a1a',
                border: 'none',
                padding: '.6rem 1.2rem',
                borderRadius: '50px',
                fontSize: '.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Icon size={18} className="text-current" />
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
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem', fontWeight: 700, color: '#ad2c4d', marginBottom: '1.5rem', paddingBottom: '.75rem', borderBottom: '2px solid #f0f0f0' }}>
              <Icon size={22} className="text-current" />
              {key}
            </h2>
            <div className="faq-list">
              {faqData[key]?.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
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
                          textDecoration: 'none'
                        }}
                      >
                        {item.link.text} <ArrowRight size={16} />
                      </Link>
                    </p>
                  )}
                </details>
              ))}
            </div>
          </div>
        ))}

        {/* CTA Section */}
        <div style={{ background: 'linear-gradient(135deg,#1a1a1a,#2d2d2d)', color: 'white', borderRadius: '12px', padding: '3rem', textAlign: 'center', marginTop: '4rem' }}>
          <h2 style={{ color: 'white', marginBottom: '.75rem' }}>Still have questions?</h2>
          <p style={{ color: 'rgba(255,255,255,.8)', marginBottom: '1.5rem' }}>Our team responds within 24–48 hours — reach out any time.</p>
          <Link href="/contact" className="btn btn-primary" style={{ marginRight: '1rem' }}>Contact Us</Link>
          <Link href="/apply" className="btn" style={{ background: 'white', color: '#1a1a1a' }}>Apply Now</Link>
        </div>
      </div>
    </section>
  );
}
