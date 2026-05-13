'use client';

import { useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';
import { FAQ_CATEGORIES as categories, FAQ_DATA as faqData, type FaqCategoryKey } from '@/lib/content/faqData';

const sidebarGroups = [
  { label: 'General Questions', keys: ['General Questions', 'Applying & Eligibility', 'Cost & Funding'] },
  { label: 'For Members', keys: ['Programs & Training', 'Job Placement', 'For Members'] },
  { label: 'For Employers', keys: ['For Employers'] },
];

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
                        onClick={() => setActiveCategory(cat.key)}
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
                Reach out and WorkforceAP can help you figure out the right next step.
              </p>
              <LocalizedLink href="/contact" style={{
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
              </LocalizedLink>
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
                    Looking to hire certified talent? <LocalizedLink href="/partners" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>Learn about our partnership model &rarr;</LocalizedLink>
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
                            <LocalizedLink
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
              Our team is here to help. Reach out directly if you want help understanding programs, eligibility, or next steps.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <LocalizedLink href="/contact" style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--color-accent)',
                color: '#fff',
                borderRadius: '0.5rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}>
                Contact Us
              </LocalizedLink>
              <LocalizedLink href="/apply" style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--surface-container-high)',
                color: 'var(--color-accent)',
                borderRadius: '0.5rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}>
                Apply Now
              </LocalizedLink>
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
