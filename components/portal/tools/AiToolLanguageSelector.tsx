'use client';

const OPTIONS = [
  { code: 'en', label: 'English', status: 'Available now', disabled: false },
  { code: 'es', label: 'Español', status: 'Coming next', disabled: true },
  { code: 'fr', label: 'Français', status: 'Coming later', disabled: true },
  { code: 'pt', label: 'Português', status: 'Coming later', disabled: true },
] as const;

export default function AiToolLanguageSelector() {
  return (
    <section
      aria-label="AI tool response language"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        padding: '0.875rem 1rem',
        marginBottom: '1rem',
        borderRadius: '0.75rem',
        border: '1px solid var(--outline-variant, rgba(0,0,0,0.08))',
        background: 'var(--surface-container-low)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)' }} aria-hidden="true">
          translate
        </span>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
          Response language
        </p>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
          English today · Spanish next
        </span>
      </div>
      <div role="group" aria-label="AI tool response language options" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {OPTIONS.map((option) => (
          <button
            key={option.code}
            type="button"
            disabled={option.disabled}
            aria-pressed={option.code === 'en'}
            title={option.disabled ? `${option.label} support is not live yet` : `${option.label} is available now`}
            className={option.code === 'en' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
            style={{
              minHeight: '36px',
              opacity: option.disabled ? 0.68 : 1,
              cursor: option.disabled ? 'not-allowed' : 'default',
            }}
          >
            {option.label}
            <span style={{ fontSize: '0.68rem', fontWeight: 700, opacity: 0.82 }}> · {option.status}</span>
          </button>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.45, color: 'var(--color-on-surface-variant)' }}>
        This tool still generates English responses. We will turn on Spanish before French and Portuguese.
      </p>
    </section>
  );
}
