'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';

const CATEGORY_CHIPS = ['All', 'Programs', 'Cost', 'Eligibility', 'Process', 'Employers'];

const FAQ_ITEMS: { q: string; a: string; category: string; link?: { text: string; href: string } }[] = [
  {
    q: 'Is it really free?',
    a: 'Yes — completely. No tuition, no application fee, no hidden costs, no textbooks to buy, and no certification exam fees. Our programs are funded through federal workforce grants, employer partnerships, and community support. You will never receive a bill from us.',
    category: 'Cost',
    link: { text: 'View Programs', href: '/programs' },
  },
  {
    q: 'Who qualifies?',
    a: "Most people who apply do qualify. You need to be 16 or older, a U.S. citizen or permanent resident, and have (or be working toward) a high school diploma or GED. We prioritize people who are unemployed, underemployed, or looking to change careers. If you're unsure, apply anyway — we'll let you know within 24–48 hours.",
    category: 'Eligibility',
    link: { text: 'Start Your Application', href: '/apply' },
  },
  {
    q: 'What if I\'m not technical?',
    a: "That's exactly who we built this for. Our programs start from zero — no coding background, no IT history required. We've helped career-changers and adults who've never worked in tech land roles in IT, cybersecurity, and data analytics. What matters most is your commitment to finishing.",
    category: 'Eligibility',
    link: { text: 'Take the Career Quiz', href: '/find-your-path' },
  },
  {
    q: "What if I'm starting over?",
    a: "Starting over is one of the most common reasons people come to us. Whether you left a job, got laid off, or are just ready for a different path — we work with you from where you are now. Your counselor will help you pick the right program and stay on track.",
    category: 'Eligibility',
    link: { text: 'Find Your Path', href: '/find-your-path' },
  },
  {
    q: 'How long do programs take?',
    a: 'Most programs take 3–5 months at 10 hours per week. Digital Literacy is shorter at 6–7 weeks. Programs are designed to be completed while working part-time or managing family responsibilities.',
    category: 'Programs',
    link: { text: 'Explore Programs', href: '/programs' },
  },
  {
    q: 'Do you help members find jobs?',
    a: "Yes — job placement is a core part of what we do. We provide resume building, interview prep, LinkedIn coaching, and direct connections to employers hiring for your role. Most graduates secure employment within 3–6 months of certification.",
    category: 'Process',
    link: { text: 'Apply Now', href: '/apply' },
  },
  {
    q: 'Is this online?',
    a: "Yes. All training is delivered virtually — you can participate from home or anywhere with a reliable internet connection. No commute, no relocation required. Some programs include optional in-person events if you want them.",
    category: 'Programs',
  },
  {
    q: 'What happens after I apply?',
    a: 'Here\'s what to expect: (1) You submit our online application — takes about 10 minutes. (2) We review and follow up within 48 hours. (3) We schedule a brief call to understand your goals. (4) If it\'s a good fit, you get a start date and onboarding instructions. No test, no gatekeeping.',
    category: 'Process',
    link: { text: 'Start Your Application', href: '/apply' },
  },
  {
    q: 'Do I need a laptop?',
    a: "You need access to a computer and reliable internet to participate. If you don't have a laptop, apply anyway — members who complete a program may qualify for a refurbished laptop through our Loaner Laptop Program. We won't turn away a committed member over equipment.",
    category: 'Programs',
  },
  {
    q: 'Can I talk to someone first?',
    a: "Absolutely. If you have questions or want to talk through whether this is a good fit before committing, reach out. Our team responds within 24–48 hours and is happy to have a real conversation.",
    category: 'Process',
    link: { text: 'Contact Us', href: '/contact' },
  },
  {
    q: 'Are these industry certifications?',
    a: "Yes. You'll earn industry-recognized certificates from partners like Google, IBM, Microsoft, Amazon, and CompTIA. These are the same credentials employers hire against.",
    category: 'Programs',
  },
  {
    q: 'How do employer partnerships work?',
    a: 'We train and certify job-ready candidates in high-demand fields. Employers gain access to a pipeline of pre-vetted, certified talent at no recruitment cost. We handle training, you handle hiring.',
    category: 'Employers',
  },
];

export default function FAQMobileSection() {
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(['What is the cost?']));

  const toggle = (q: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
  };

  const filtered = FAQ_ITEMS.filter((item) => {
    const matchChip = activeChip === 'All' || item.category === activeChip;
    const matchSearch =
      search.trim() === '' ||
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase());
    return matchChip && matchSearch;
  });

  return (
    <div className="marketing-mobile marketing-mobile-pb-for-bottom-nav" style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      {/* Hero + Search */}
      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1c1b1b] leading-tight" style={{ marginBottom: '1.5rem' }}>
          Frequently Asked Questions
        </h1>
        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '1rem', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            <span className="material-symbols-outlined text-[#8b7073]" aria-hidden="true">search</span>
          </div>
          <label htmlFor="faq-search-input" className="sr-only">Search frequently asked questions</label>
          <input
            id="faq-search-input"
            className="focus:ring-2 focus:ring-[#8c0f37]/40 transition-all text-[#1c1b1b] placeholder:text-[#584144]/60 text-sm"
            style={{
              width: '100%',
              height: '3.5rem',
              paddingLeft: '3rem',
              paddingRight: '1rem',
              background: '#ebe7e7',
              borderRadius: '0.75rem',
              border: 'none',
              boxSizing: 'border-box',
            }}
            placeholder="Search for answers..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Chips */}
      <div style={{ marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', overflowX: 'auto', paddingLeft: '1.5rem', paddingRight: '1.5rem', gap: '0.5rem', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveChip(chip)}
              className={`transition-colors ${
                activeChip === chip
                  ? 'bg-[#8c0f37] text-white'
                  : 'bg-[#e5e2e1] text-[#584144]'
              }`}
              style={{ flexShrink: 0, paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.025em', border: 'none', cursor: 'pointer' }}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion FAQ List */}
      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const isOpen = openItems.has(item.q);
              return (
                <div key={item.q} style={{ background: '#f6f3f2', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <button
                    className="active:bg-[#f0edec] transition-colors"
                    style={{
                      width: '100%',
                      paddingLeft: '1.25rem',
                      paddingRight: '1.25rem',
                      paddingTop: '1.25rem',
                      paddingBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggle(item.q)}
                  >
                    <span className="font-bold text-[#1c1b1b] leading-snug" style={{ paddingRight: '1rem' }}>{item.q}</span>
                    <span
                      className={`material-symbols-outlined transition-transform duration-200 ${
                        isOpen ? 'text-[#8c0f37]' : 'text-[#8b7073]'
                      }`}
                      style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      expand_more
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingBottom: '1.25rem' }}>
                      <p className="text-[#584144] text-sm leading-relaxed">{item.a}</p>
                      {item.link && (
                        <Link
                          href={item.link.href}
                          className="inline-flex items-center gap-1 text-[#8c0f37] font-semibold text-sm hover:underline mt-3"
                        >
                          {item.link.text}
                          <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', paddingTop: '3rem', paddingBottom: '3rem', color: '#584144' }}>
              <span className="material-symbols-outlined text-4xl opacity-30" style={{ display: 'block', marginBottom: '0.75rem' }} aria-hidden="true">search_off</span>
              <p className="font-medium">No results found for &ldquo;{search}&rdquo;</p>
              <button
                className="text-[#8c0f37] font-semibold text-sm"
                style={{ marginTop: '0.75rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={() => { setSearch(''); setActiveChip('All'); }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center', paddingTop: '2rem', paddingBottom: '2rem', background: 'rgba(240,237,236,0.3)', borderRadius: '1rem' }}>
          <p className="text-[#584144] font-medium" style={{ marginBottom: '0.5rem' }}>Still have questions?</p>
          <Link
            href="/contact"
            className="text-[#8c0f37] font-bold hover:underline group"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
          >
            Contact Us
            <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>

      {/* Featured Resource */}
      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', marginBottom: '2rem' }}>
        <div
          style={{
            position: 'relative',
            borderRadius: '1rem',
            overflow: 'hidden',
            aspectRatio: '16/9',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '1.25rem',
            background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(140,15,55,0.9), transparent)' }} />
          <div style={{ position: 'relative', zIndex: 10 }}>
            <span style={{ background: '#ffbb00', color: '#261900', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', marginBottom: '0.5rem', display: 'inline-block' }}>
              New Resource
            </span>
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem' }}>The 2025 Career Guide</h3>
            <p style={{ marginTop: '0.25rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
              Download our latest research on workforce trends.
            </p>
          </div>
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
