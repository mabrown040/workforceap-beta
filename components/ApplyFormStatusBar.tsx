'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

const steps = [
  { id: 'personal', label: 'Personal', shortLabel: 'Info' },
  { id: 'location', label: 'Location', shortLabel: 'Location' },
  { id: 'employment', label: 'Employment', shortLabel: 'Work' },
  { id: 'income', label: 'Income', shortLabel: 'Income' },
  { id: 'program', label: 'Program', shortLabel: 'Program' },
  { id: 'support', label: 'Support', shortLabel: 'Support' },
  { id: 'submit', label: 'Submit', shortLabel: 'Submit' },
];

export default function ApplyFormStatusBar() {
  const [activeIndex, setActiveIndex] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    const offset = 140;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const sectionEls = steps
      .map((s) => document.getElementById(`section-${s.id}`))
      .filter(Boolean) as HTMLElement[];

    if (sectionEls.length === 0) return;

    const onIntersect: IntersectionObserverCallback = (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length === 0) return;

      const indices = visible
        .map((e) => {
          const id = e.target.id.replace('section-', '');
          return steps.findIndex((s) => s.id === id);
        })
        .filter((idx) => idx !== -1);

      if (indices.length === 0) return;
      const next = Math.min(...indices);
      setActiveIndex(next);
    };

    // `-50%` scales the bottom margin to the viewport so the "active" band
    // stays proportional on short vs. tall screens. Mixed px/% units are
    // valid per spec, but some legacy browsers throw a SyntaxError when
    // parsing rootMargin with mixed units — fall back to an all-px margin
    // (~half of a typical mobile viewport) if construction fails.
    let observer: IntersectionObserver;
    try {
      observer = new IntersectionObserver(onIntersect, {
        rootMargin: '-120px 0px -50% 0px',
        threshold: 0,
      });
    } catch {
      try {
        observer = new IntersectionObserver(onIntersect, {
          rootMargin: '-120px 0px -400px 0px',
          threshold: 0,
        });
      } catch {
        return;
      }
    }

    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const progress = ((activeIndex + 1) / steps.length) * 100;

  return (
    <div className="apply-status-bar" ref={barRef}>
      <div className="apply-status-track">
        <div className="apply-status-fill" style={{ width: `${progress}%` }} />
      </div>
      <nav className="apply-status-steps" aria-label="Form progress">
        {steps.map((step, i) => (
          <button
            key={step.id}
            type="button"
            className={`apply-status-step${i === activeIndex ? ' active' : ''}${i < activeIndex ? ' completed' : ''}`}
            aria-current={i === activeIndex ? 'step' : undefined}
            aria-label={`${step.label}${i < activeIndex ? ', completed' : i === activeIndex ? ', current' : ', not started'}`}
            onClick={() => scrollToSection(step.id)}
          >
            <span className="apply-status-dot">
              {i < activeIndex ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </span>
            <span className="apply-status-label">{step.label}</span>
            <span className="apply-status-label-short">{step.shortLabel}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
