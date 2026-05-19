import LocalizedLink from '@/components/LocalizedLink';
import { APPLY_FAQ_ITEMS } from '@/lib/content/applyFaqData';
import { getTranslations } from 'next-intl/server';

export default async function ApplyFAQSection() {
  const t = await getTranslations('apply');

  return (
    <section
      aria-labelledby="apply-faq-heading"
      style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto var(--space-8)',
        padding: '0 var(--space-6)',
      }}
    >
      <h2
        id="apply-faq-heading"
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 800,
          color: 'var(--color-on-surface)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {t('faqHeading')}
      </h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}
      >
        {APPLY_FAQ_ITEMS.map((item) => (
          <details
            key={item.q}
            style={{
              background: 'var(--surface-container)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--outline-variant)',
              padding: 'var(--space-4) var(--space-5)',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontWeight: 700,
                color: 'var(--color-on-surface)',
                listStyle: 'none',
              }}
            >
              {item.q}
            </summary>
            <p
              style={{
                margin: 'var(--space-3) 0 0',
                color: 'var(--color-on-surface-variant)',
                lineHeight: 'var(--line-height-normal)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              {item.a}
              {item.link ? (
                <>
                  {' '}
                  <LocalizedLink href={item.link.href} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                    {item.link.text}
                  </LocalizedLink>
                </>
              ) : null}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
