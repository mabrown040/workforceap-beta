'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';

const CATEGORY_CHIPS = ['All', 'Programs', 'Cost', 'Eligibility', 'Process', 'Employers'];

const FAQ_ITEMS = [
  {
    q: 'What is the cost?',
    a: 'Our programs are 100% free for eligible candidates. We believe in removing financial barriers to high-quality technical education and workforce development. No hidden fees, no textbook costs, no application charges.',
    category: 'Cost',
  },
  {
    q: 'How long are programs?',
    a: 'Most programs take 3–5 months at 10 hours per week. Digital Literacy is shorter at 6–7 weeks. Programs are designed to be completed while working part-time or managing family responsibilities.',
    category: 'Programs',
  },
  {
    q: 'Do I need tech experience?',
    a: 'No. Our programs are built for beginners. We\'ve trained career-changers, unemployed workers, and people with zero tech experience. We start with fundamentals.',
    category: 'Eligibility',
  },
  {
    q: 'Is there a laptop program?',
    a: 'Access to a computer and internet is required to participate. Upon successful program completion, you may earn a refurbished laptop through our Loaner Laptop Program.',
    category: 'Programs',
  },
  {
    q: 'Are these industry certifications?',
    a: 'Yes. You\'ll earn industry-recognized certificates from partners like Google, IBM, Microsoft, Amazon, and CompTIA. These are the same credentials employers hire against.',
    category: 'Programs',
  },
  {
    q: 'What are the eligibility requirements?',
    a: 'To apply: (1) 16 years or older, (2) U.S. citizen or permanent resident, (3) high school diploma or GED (or in process), (4) committed to program completion, (5) willing to participate in job placement.',
    category: 'Eligibility',
  },
  {
    q: 'What is the application process?',
    a: 'Simple: (1) Fill out our online form, (2) We review within 48 hours, (3) We schedule a brief call to discuss your goals, (4) You get your start date and onboarding. No test, no gatekeeping.',
    category: 'Process',
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
    <div className="md:wa-hidden marketing-mobile marketing-mobile-pb-for-bottom-nav" style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      {/* Hero + Search */}
      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1c1b1b] leading-tight" style={{ marginBottom: '1.5rem' }}>
          Frequently Asked Questions
        </h1>
        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '1rem', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            <span className="material-symbols-outlined text-[#8b7073]">search</span>
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
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', paddingTop: '3rem', paddingBottom: '3rem', color: '#584144' }}>
              <span className="material-symbols-outlined text-4xl opacity-30" style={{ display: 'block', marginBottom: '0.75rem' }}>search_off</span>
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
            <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
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
