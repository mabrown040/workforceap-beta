'use client';

import { useState } from 'react';
import Link from 'next/link';

const categories = [
  { key: 'Admissions', icon: '📋' },
  { key: 'Programs', icon: '🎓' },
  { key: 'Job Placement Assistance', icon: '💼' },
  { key: 'Support & Scheduling', icon: '💰' },
  { key: 'Technical', icon: '💻' },
];

const faqData: Record<string, { q: string; a: string }[]> = {
  Admissions: [
    { q: 'What are the eligibility requirements?', a: 'To apply to Workforce Advancement Project, you must be: (1) 16 years or older, (2) a U.S. citizen or permanent resident, (3) possess a high school diploma or GED or in process, (4) committed to 100% program completion, (5) willing to participate in job placement assistance services, and (6) have access to a reliable internet connection and computer. We welcome applicants from all backgrounds, including those with no prior tech experience.' },
    { q: 'Do I need prior tech experience to apply?', a: "No! WorkforceAP programs are designed for beginners with no technical background. We start with fundamentals and build your skills progressively. We've successfully trained career-changers, unemployed workers, and students with zero tech experience. The most important thing is your commitment to learning and completing the program." },
    { q: 'What is the application process?', a: "Our application process is straightforward: (1) Complete our online application form with your personal info and program interest, (2) Our admissions team reviews your application within 48 hours, (3) If you're a good fit, we'll schedule a brief intake call to discuss your goals, (4) Upon approval, you'll receive your start date and onboarding materials. The entire process typically takes 5–7 business days." },
    { q: 'Is there an application fee?', a: 'There is no application fee. Once you apply, our admissions team reviews your goals, confirms program fit, and shares the next steps before your cohort begins.' },
    { q: 'When do programs start?', a: "We run cohorts on a rolling basis throughout the year. New cohorts typically start monthly, though some programs have cohorts starting bi-weekly. Once you're approved, we'll connect you with the next available start date. You can also request to wait for a future cohort if timing works better for you." },
  ],
  Programs: [
    { q: 'How long are the programs?', a: "Most WorkforceAP programs run 16–20 weeks depending on the course. We offer flexible scheduling with both full-time (30–40 hrs/week) and part-time (15–20 hrs/week) options. You'll have access to course materials for 6 months after graduation to review anytime." },
    { q: 'What programs do you offer?', a: 'We offer industry-recognized training in: AI Fundamentals, IT Support (CompTIA A+, Network+), Cybersecurity, Cloud Computing (AWS), Data Analytics, Digital Marketing, UX Design, Project Management, Medical Coding, Production Technician, Logistics Technician, and Construction Skilled Trades. All programs include hands-on labs and industry certifications.' },
    { q: 'What certifications will I earn?', a: "Certifications include Google Cloud, CompTIA A+ and Network+, AWS Solutions Architect, Microsoft Azure, PMP, and more. All certifications are industry-recognized and remain valid for 3+ years. You'll receive official digital badges and certificates upon completion." },
    { q: 'Are classes online or in-person?', a: 'Both! Most training is available online for flexibility. We also offer in-person cohorts in the Austin area. When you apply, indicate your preference and we will match you with the format that works best for your situation.' },
    { q: 'What technology do I need?', a: "A computer (at least 4GB RAM), reliable internet (25+ Mbps for video), webcam and microphone for live sessions. We provide all course materials and cloud-based labs, so you won't need expensive software." },
  ],
  'Job Placement Assistance': [
    { q: 'Is job placement assistance guaranteed?', a: "While we can't guarantee employment, we have an 80% job placement assistance rate for graduates who actively participate in our placement services. We provide resume coaching, interview prep, LinkedIn optimization, and direct introductions to hiring partners. Those who complete the program and actively interview typically land roles within 30–60 days." },
    { q: 'What is the average salary after graduation?', a: 'Average starting salaries range from $55,000–$95,000 depending on the program. IT Support roles start around $55,000–$72,000, while Cloud/AI roles average $88,000–$145,000. After 2 years, many graduates earn $85,000–$135,000+.' },
    { q: 'How does job placement assistance work?', a: 'Our support includes: (1) Resume optimization for ATS systems, (2) Interview coaching (behavioral & technical), (3) LinkedIn profile optimization, (4) Professional networking events, (5) Direct introductions to hiring partners, (6) Salary negotiation guidance, (7) Post-placement support for the first 90 days. Your dedicated job coach works with you 1-on-1 starting in week 4.' },
    { q: 'Who are your employer partners?', a: 'We partner with employers across tech, service, manufacturing, healthcare, and government, adding more consistently. We have placed people at Amazon, Indeed, Oracle, IBM, Dell, Google, Samsung, Tesla, Meta, Department of Information Resources (DIR), State of Texas, Travis County, City of Austin, and many other companies.' },
    { q: "What if I don't find a job after graduation?", a: 'Our placement team continues working with you for up to 12 months after graduation. We offer continued interview coaching, portfolio guidance, networking introductions, and career consulting. Most graduates who engage with these services find roles within 6 months.' },
  ],
  'Support & Scheduling': [
    { q: 'What support is included during training?', a: 'WorkforceAP pairs training with career coaching, study support, live instruction, and job placement assistance so learners have help from application through completion.' },
    { q: 'Can you help me choose the right schedule?', a: 'Yes. We offer multiple cohort timelines, and our team can help you compare pacing, expected weekly hours, and the next available start dates during your intake call.' },
    { q: 'What if I need to take a break?', a: "Life happens! You can pause your current cohort and join a future one (within 12 months), adjust to a part-time schedule, or work with instructors on an extension timeline. We want you to succeed, so we're willing to work with you on solutions that fit your circumstances." },
    { q: 'What support services are available?', a: "Beyond academics: 1-on-1 mentoring and tutoring, career coaching and resume help, mental health resources, technology support, interview practice with industry professionals, peer study groups, and alumni network access. Our goal is your complete success, not just completing coursework." },
  ],
  Technical: [
    { q: 'What if I have technical difficulties during the program?', a: 'Our IT Support Team is available during all live sessions and office hours. Contact us via chat during sessions, email support@workforceap.org, or schedule a 1-on-1 tech support appointment. Most issues are resolved within 24 hours.' },
    { q: 'Do you offer accommodations for accessibility needs?', a: 'Absolutely. We offer: closed captions on all video lectures, screen reader compatible materials, flexible scheduling for medical appointments, extended exam time, one-on-one tutoring, and adjusted workload as needed. Please let us know about accommodations when you apply.' },
    { q: 'Can I download course materials for offline access?', a: "Yes! All materials, lectures, and labs are downloadable for offline access. Once downloaded, materials remain yours forever. We also provide USB drives with first-week content so you can get started right away." },
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
              {cat.icon} {cat.key}
            </button>
          ))}
        </div>

        {categories.map((cat) => (
          <div
            key={cat.key}
            className="faq-section"
            style={{ display: activeCategory === cat.key ? 'block' : 'none' }}
          >
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ad2c4d', marginBottom: '1.5rem', paddingBottom: '.75rem', borderBottom: '2px solid #f0f0f0' }}>
              {cat.icon} {cat.key}
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
          <p style={{ color: 'rgba(255,255,255,.8)', marginBottom: '1.5rem' }}>Our team responds within 24 hours — reach out any time.</p>
          <Link href="/contact" className="btn btn-primary" style={{ marginRight: '1rem' }}>Contact Us</Link>
          <Link href="/apply" className="btn" style={{ background: 'white', color: '#1a1a1a' }}>Apply Now</Link>
        </div>
      </div>
    </section>
  );
}
