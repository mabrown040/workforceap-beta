import { useTranslations } from 'next-intl';
import type { Testimonial } from '@/content/testimonials';
import TestimonialCard from './TestimonialCard';

export type TestimonialsRowProps = {
  testimonials: Testimonial[];
  /** Optional override for the section title (defaults to translated heading). */
  title?: string;
  /** Optional href for a "View more stories" link. Omit to hide the CTA. */
  viewMoreHref?: string;
};

/**
 * TestimonialsRow — horizontal scroll-snap row of TestimonialCards.
 *
 * Layout:
 *   - mobile: 1 card per viewport, horizontal scroll-snap
 *   - desktop (>= 768px): 3 cards per row, no snap needed
 *
 * Pure CSS scroll-snap keeps this a server component. The data is static
 * and rendered server-side, so no client hooks are required.
 */
export default function TestimonialsRow({
  testimonials,
  title,
  viewMoreHref,
}: TestimonialsRowProps) {
  const t = useTranslations('marketing.testimonials');

  if (testimonials.length === 0) return null;

  const heading = title ?? t('sectionTitle');
  const subheading = t('sectionSubtitle');
  const salaryLiftLabel = t('salaryLiftLabel');
  const viewMoreLabel = t('viewMore');
  const regionLabel = t('regionLabel');

  return (
    <section
      aria-label={regionLabel}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        color: 'var(--color-on-surface)',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
          paddingInline: '1rem',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1.625rem',
            lineHeight: 1.2,
            fontWeight: 800,
            color: 'var(--color-on-surface)',
          }}
        >
          {heading}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            color: 'var(--color-on-surface-variant)',
          }}
        >
          {subheading}
        </p>
      </header>

      <ul
        role="list"
        className="testimonials-row__track"
        style={{
          listStyle: 'none',
          margin: 0,
          padding: '0.25rem 1rem 1rem',
        }}
      >
        {testimonials.map((item) => (
          <li
            key={item.id}
            className="testimonials-row__item"
            style={{ display: 'flex' }}
          >
            <TestimonialCard
              quote={item.quote}
              name={item.name}
              role={item.role}
              program={item.program}
              salaryBefore={item.salaryBefore}
              salaryAfter={item.salaryAfter}
              avatarUrl={item.avatarUrl}
              salaryLiftLabel={salaryLiftLabel}
            />
          </li>
        ))}
      </ul>

      {viewMoreHref && (
        <div style={{ paddingInline: '1rem' }}>
          <a
            href={viewMoreHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '44px',
              minWidth: '44px',
              padding: '0.625rem 1rem',
              borderRadius: '9999px',
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-container-lowest)',
              color: 'var(--color-on-surface)',
              fontWeight: 600,
              fontSize: '0.9375rem',
              textDecoration: 'none',
            }}
          >
            {viewMoreLabel}
          </a>
        </div>
      )}

      {/*
        Scoped styles for the scroll-snap row. We can't use Tailwind
        responsive classes for `scroll-snap-type` reliably across versions,
        so a small inline <style> keeps the layout self-contained.
      */}
      <style>{`
        .testimonials-row__track {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 85%;
          gap: 1rem;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }
        .testimonials-row__item {
          scroll-snap-align: start;
          min-width: 0;
        }
        @media (min-width: 768px) {
          .testimonials-row__track {
            grid-auto-columns: minmax(0, 1fr);
            grid-template-columns: repeat(3, minmax(0, 1fr));
            grid-auto-flow: row;
            overflow-x: visible;
            scroll-snap-type: none;
          }
          .testimonials-row__item {
            scroll-snap-align: none;
          }
        }
      `}</style>
    </section>
  );
}
