'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClipboardList, GraduationCap, Briefcase, DollarSign, Clock } from 'lucide-react';

const categories = [
  { key: 'Admissions', Icon: ClipboardList },
  { key: 'Cost & Funding', Icon: DollarSign },
  { key: 'Programs & Training', Icon: GraduationCap },
  { key: 'Job Placement', Icon: Briefcase },
  { key: 'Schedule & Commitment', Icon: Clock },
];

const faqData: Record<string, { q: string; a: string }[]> = {
  Admissions: [
    { q: 'What are the eligibility requirements?', a: 'To apply to Workforce Advancement Project, you must be: (1) 16 years or older, (2) a U.S. citizen or permanent resident, (3) possess a high school diploma or GED or in process, (4) committed to 100% program completion, (5) willing to participate in job placement assistance services, and (6) have access to a reliable internet connection and computer. We welcome applicants from all backgrounds, including those with no prior tech experience.' },
    { q: 'Do I need prior tech experience to apply?', a: "No! WorkforceAP programs are designed for beginners with no technical background. We start with fundamentals and build your skills progressively. We've successfully trained career-changers, unemployed workers, and students with zero tech experience. The most important thing is your commitment to learning and completing the program." },
    { q: 'What is the application process?', a: "Our application process is straightforward: (1) Complete our online application form with your personal info and program interest, (2) Our admissions team reviews your application within 48 hours, (3) If you're a good fit, we'll schedule a brief intake call to discuss your goals, (4) Upon approval, you'll receive your start date and onboarding materials. The entire process typically takes 5–7 business days." },
    { q: 'Is there an application fee?', a: 'There is no application fee. Once you apply, our admissions team reviews your goals, confirms program fit, and shares the next steps before your program begins.' },
    { q: 'When do programs start?', a: "We run programs on a rolling basis throughout the year. New programs typically start monthly, though some have start dates bi-weekly. Once you're approved, we'll connect you with the next available start date. You can also request to wait for a future program if timing works better for you." },
  ],
  'Cost & Funding': [
    { q: 'How much does the program cost?', a: 'Our programs are available at no cost to qualifying participants. There are no hidden fees, textbook costs, or application charges.' },
    { q: "What does 'qualifying' mean?", a: "If you are 16+, a US citizen or permanent resident, and unemployed or underemployed with household income under $60K, you likely qualify. Apply and we'll confirm within 24–48 hours." },
    { q: 'Do I need to pay anything back?', a: 'No. This is not a loan. Training is funded through grants and partnerships.' },
  ],
  'Programs & Training': [
    { q: 'How long are the programs?', a: 'Most programs take 3–5 months at 10 hours per week. Digital Literacy is shorter at 6–7 weeks.' },
    { q: 'Are programs online or in person?', a: 'Programs are virtual and hybrid — you can complete training from home with an internet connection.' },
    { q: 'Do I need my own computer?', a: 'Access to a computer and internet is required. Upon successful program completion, you may earn a refurbished laptop through our Loaner Laptop Program.' },
    { q: 'What certifications will I earn?', a: "You'll earn industry-recognized certificates from partners like Google, IBM, Microsoft, Amazon, and CompTIA. These are the same credentials employers hire against." },
  ],
  'Job Placement': [
    { q: 'Will you help me find a job?', a: 'Yes. We provide 100% job search support including resume building, interview prep, and connections to employers hiring for your role.' },
    { q: 'What kind of jobs will I qualify for?', a: 'Entry-level to mid-level roles in IT, cybersecurity, data analytics, project management, healthcare, and skilled trades. Starting salaries range from $38K to $145K depending on the program.' },
    { q: 'How soon after graduating can I get hired?', a: 'Many members begin applying during training. Job placement timelines vary, but our team works with you from day one of training through your first hire.' },
  ],
  'Schedule & Commitment': [
    { q: 'How many hours per week?', a: 'Most programs require about 10 hours per week. You can train around a part-time job or family schedule.' },
    { q: 'Can I work while enrolled?', a: 'Yes. Programs are designed to be flexible for working adults.' },
    { q: 'What if I fall behind?', a: "Your counselor will work with you to adjust your pace. We're invested in your completion — not just your enrollment." },
  ],
};

export default function FAQContent() {
  const [activeCategory, setActiveCategory] = useState('Admissions');

  return (
    <section className="content-section">
      <div className="container">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '2.5rem' }}>
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: activeCategory === cat.key ? '#ad2c4d' : '#f0f0f0',
                color: activeCategory === cat.key ? 'white' : '#1a1a1a',
                border: 'none',
                padding: '.6rem 1.2rem',
                borderRadius: '50px',
                fontSize: '.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <cat.Icon size={18} className="text-current" />
              {cat.key}
            </button>
          ))}
        </div>

        {categories.map((cat) => (
          <div
            key={cat.key}
            className="faq-section"
            style={{ display: activeCategory === cat.key ? 'block' : 'none' }}
          >
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem', fontWeight: 700, color: '#ad2c4d', marginBottom: '1.5rem', paddingBottom: '.75rem', borderBottom: '2px solid #f0f0f0' }}>
              <cat.Icon size={22} className="text-current" />
              {cat.key}
            </h2>
            <div className="faq-list">
              {faqData[cat.key]?.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}

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
