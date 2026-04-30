type VoiceSessionIntroStripProps = {
  items: string[];
};

export default function VoiceSessionIntroStrip({ items }: VoiceSessionIntroStripProps) {
  return (
    <div
      className="portal-card portal-card--flat"
      style={{
        padding: '1rem 1.1rem',
        borderRadius: 16,
        marginBottom: '1rem',
        background: 'var(--surface-container-low)',
      }}
    >
      <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {items.map((item) => (
          <div
            key={item}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: 'var(--color-on-surface-variant)',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden>
              check_circle
            </span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
