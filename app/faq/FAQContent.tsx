'use client';

import { useState, type ReactNode } from 'react';
import LocalizedLink from '@/components/LocalizedLink';
import { FAQ_CATEGORIES as categories, FAQ_DATA as faqData, type FaqCategoryKey } from '@/lib/content/faqData';

const sidebarGroups = [
  { label: 'General Questions', keys: ['General Questions', 'Applying & Eligibility', 'Cost & Funding'] },
  { label: 'For Members', keys: ['Programs & Training', 'Job Placement', 'For Members'] },
  { label: 'For Employers', keys: ['For Employers'] },
];

// Inline SVG icons per category (no icon-font dependency; matches approved mockup).
const CATEGORY_ICONS: Record<FaqCategoryKey, ReactNode> = {
  'General Questions': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .8-1 1.7M12 17h.01" />
    </>
  ),
  'Applying & Eligibility': (
    <>
      <path d="M9 11l2 2 4-4" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  'Cost & Funding': (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  'Programs & Training': (
    <>
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1 3 2 6 2s6-1 6-2v-5" />
    </>
  ),
  'Job Placement': (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  'For Members': (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  'For Employers': (
    <>
      <path d="M3 21h18M5 21V8l7-4 7 4v13" />
      <path d="M9 21v-5h6v5" />
    </>
  ),
};

function CategoryIcon({ category, size }: { category: FaqCategoryKey; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {CATEGORY_ICONS[category]}
    </svg>
  );
}

export default function FAQContent() {
  const [activeCategory, setActiveCategory] = useState<FaqCategoryKey>('General Questions');
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
    <section className="wa-faq-band">
      <div className="wa-wrap">
        <div className="wa-faq-layout">
          {/* ── Sidebar Nav ── */}
          <aside className="wa-faq-sidebar">
            <nav>
              {sidebarGroups.map((group) => (
                <div key={group.label} className="wa-side-group">
                  <p className="wa-lab">{group.label}</p>
                  {group.keys.map((key) => {
                    const cat = categories.find((c) => c.key === key);
                    if (!cat) return null;
                    const isActive = activeCategory === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveCategory(cat.key)}
                        className={`wa-cat-btn${isActive ? ' is-active' : ''}`}
                        aria-pressed={isActive}
                      >
                        <CategoryIcon category={cat.key} size={18} />
                        {key}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Still need support? card */}
            <div className="wa-support-card">
              <div className="wa-sic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1v-7h3zM3 19a2 2 0 0 0 2 2h1v-7H3z" />
                </svg>
              </div>
              <p className="wa-h">Still need support?</p>
              <p>Reach out and WorkforceAP can help you figure out the right next step.</p>
              <LocalizedLink href="/contact" className="wa-btn wa-btn--primary">
                Contact Us
              </LocalizedLink>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <div>
            {/* For Employers accent banner */}
            {activeCategory === 'For Employers' && (
              <div className="wa-emp-banner">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M8 11l3 3 5-6" />
                  <path d="M5 12a7 7 0 0 1 14 0" />
                  <path d="M3 12l2 8h14l2-8" />
                </svg>
                <div>
                  <p className="wa-h">Employer Partnership Inquiries</p>
                  <p>
                    Looking to hire certified talent?{' '}
                    <LocalizedLink href="/partners">Learn about our partnership model &rarr;</LocalizedLink>
                  </p>
                </div>
              </div>
            )}

            {/* Section heading */}
            <div className="wa-panel-head">
              <span className="wa-pic">
                <CategoryIcon category={activeCategory} size={26} />
              </span>
              <h2>{activeCategory}</h2>
            </div>

            {/* Accordion items */}
            <div className="wa-acc">
              {faqData[activeCategory]?.map((item) => {
                const isOpen = openItems.has(item.q);
                return (
                  <div key={item.q} className={`wa-qa${isOpen ? ' is-open' : ''}`}>
                    <button
                      type="button"
                      onClick={() => toggleItem(item.q)}
                      className="wa-qa-summary"
                      aria-expanded={isOpen}
                    >
                      <span>{item.q}</span>
                      <svg
                        className="wa-chev"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="wa-qa-body">
                        <p>{item.a}</p>
                        {item.link && (
                          <p>
                            <LocalizedLink href={item.link.href} className="wa-link">
                              {item.link.text}
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M5 12h14M13 6l6 6-6 6" />
                              </svg>
                            </LocalizedLink>
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
        <div className="wa-faq-bottom-cta">
          <div>
            <h2>Didn&rsquo;t find your answer?</h2>
            <p>
              Our team is here to help. Reach out directly if you want help understanding programs, eligibility, or next
              steps.
            </p>
            <div className="wa-acts">
              <LocalizedLink href="/contact" className="wa-btn wa-btn--primary">
                Contact Us
              </LocalizedLink>
              <LocalizedLink href="/apply" className="wa-btn wa-btn--ghost">
                Apply Now
              </LocalizedLink>
            </div>
          </div>
          <div className="wa-cta-art">
            <div className="wa-inner">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div className="wa-lab">We&rsquo;re here to help</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
