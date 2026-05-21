import { getTranslations } from 'next-intl/server';

const CONTRAST_ROWS = [
  { key: 'contrast1' as const, icon: 'work_outline' as const },
  { key: 'contrast2' as const, icon: 'account_balance' as const },
  { key: 'contrast3' as const, icon: 'schedule' as const },
] as const;

/** Factual competitor positioning — directly below the homepage hero. */
export default async function HomeCompetitorContrast() {
  const t = await getTranslations('marketing.home');

  return (
    <section
      className="home-contrast"
      aria-labelledby="home-contrast-heading"
      style={{
        background: 'var(--surface-container-low)',
        padding: 'clamp(1.75rem, 4vw, 2.75rem) 0',
        borderTop: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
        <h2
          id="home-contrast-heading"
          className="text-label-upper"
          style={{
            textAlign: 'center',
            color: 'var(--color-on-surface-variant)',
            marginBottom: '1.25rem',
            letterSpacing: '0.12em',
            fontSize: '0.625rem',
          }}
        >
          {t('contrastEyebrow')}
        </h2>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: '0.75rem',
          }}
        >
          {CONTRAST_ROWS.map((row) => (
            <li key={row.key}>
              <div
                className="portal-card portal-card--flat"
                style={{
                  background: 'var(--surface-container-lowest)',
                  padding: '1rem 1.1rem',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '1.25rem',
                    color: 'var(--color-accent)',
                    flexShrink: 0,
                    marginTop: '0.05rem',
                  }}
                  aria-hidden="true"
                >
                  {row.icon}
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'clamp(0.875rem, 0.35vw + 0.82rem, 0.95rem)',
                    lineHeight: 1.55,
                    color: 'var(--color-on-surface)',
                    fontWeight: 600,
                  }}
                >
                  {t(row.key)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
