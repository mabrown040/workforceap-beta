'use client';

import { useState } from 'react';
import Link from 'next/link';
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
    <div className="md:hidden bg-[#fcf9f8] min-h-screen pb-32">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full flex items-center justify-between px-6 h-16 z-50" style={{ background: 'rgba(252,249,248,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="active:scale-95 duration-200" aria-label="Back">
            <span className="material-symbols-outlined" style={{ color: '#8c0f37' }}>arrow_back</span>
          </Link>
          <h1 className="font-bold text-lg tracking-tight" style={{ color: '#8c0f37' }}>FAQ</h1>
        </div>
        <button
          className="active:scale-95 duration-200"
          aria-label="Search"
          onClick={() => document.getElementById('faq-search-input')?.focus()}
        >
          <span className="material-symbols-outlined" style={{ color: '#8c0f37' }}>search</span>
        </button>
      </header>

      {/* Hero + Search */}
      <div className="px-6 pt-24 mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1c1b1b] leading-tight mb-6">
          Frequently Asked Questions
        </h1>
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-[#8b7073]">search</span>
          </div>
          <input
            id="faq-search-input"
            className="w-full h-14 pl-12 pr-4 bg-[#ebe7e7] rounded-xl border-none focus:ring-2 focus:ring-[#8c0f37]/40 transition-all text-[#1c1b1b] placeholder:text-[#584144]/60 text-sm"
            placeholder="Search for answers..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Chips */}
      <div className="mb-8 -mx-0 overflow-hidden">
        <div className="flex overflow-x-auto px-6 gap-2 pb-2 no-scrollbar">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveChip(chip)}
              className={`flex-none px-5 py-2 rounded-full text-sm font-semibold tracking-wide transition-colors ${
                activeChip === chip
                  ? 'bg-[#8c0f37] text-white'
                  : 'bg-[#e5e2e1] text-[#584144]'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion FAQ List */}
      <div className="px-6 space-y-3 mb-10">
        {filtered.length > 0 ? (
          filtered.map((item) => {
            const isOpen = openItems.has(item.q);
            return (
              <div key={item.q} className="bg-[#f6f3f2] rounded-xl overflow-hidden">
                <button
                  className="w-full px-5 py-5 flex items-center justify-between text-left active:bg-[#f0edec] transition-colors"
                  onClick={() => toggle(item.q)}
                >
                  <span className="font-bold text-[#1c1b1b] leading-snug pr-4">{item.q}</span>
                  <span
                    className={`material-symbols-outlined flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? 'text-[#8c0f37] rotate-180' : 'text-[#8b7073]'
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5">
                    <p className="text-[#584144] text-sm leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-[#584144]">
            <span className="material-symbols-outlined text-4xl mb-3 block opacity-30">search_off</span>
            <p className="font-medium">No results found for &ldquo;{search}&rdquo;</p>
            <button
              className="mt-3 text-[#8c0f37] font-semibold text-sm"
              onClick={() => { setSearch(''); setActiveChip('All'); }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="px-6 mb-8">
        <div className="text-center py-8 bg-[#f0edec]/30 rounded-2xl">
          <p className="text-[#584144] font-medium mb-2">Still have questions?</p>
          <Link
            href="/contact"
            className="inline-flex items-center text-[#8c0f37] font-bold hover:underline gap-1 group"
          >
            Contact Us
            <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>

      {/* Featured Resource */}
      <div className="px-6 mb-8">
        <div className="relative rounded-2xl overflow-hidden aspect-video flex flex-col justify-end p-5 bg-gradient-to-br from-[#8c0f37] to-[#ad2c4d]">
          <div className="absolute inset-0 bg-gradient-to-t from-[#8c0f37]/90 to-transparent" />
          <div className="relative z-10">
            <span className="bg-[#ffbb00] text-[#261900] text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded mb-2 inline-block">
              New Resource
            </span>
            <h3 className="text-white font-bold text-xl">The 2024 Career Guide</h3>
            <p className="text-white/80 text-sm mt-1">
              Download our latest research on workforce trends.
            </p>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
