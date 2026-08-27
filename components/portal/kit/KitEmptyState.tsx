/** Serializable empty placeholder for server-rendered DataTable shells. */
export function KitEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 16px' }}>
      <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', margin: 0, color: 'var(--wa-text)' }}>
        {title}
      </h3>
      {description ? (
        <p className="wa-kit-lede" style={{ marginTop: 6 }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
