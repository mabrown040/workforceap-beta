type Ev = {
  id: string;
  createdAt: string;
  kind: string;
  headline: string;
  detail: string | null;
  actorName: string | null;
};

export default function PartnerWorkflowTimeline({ events }: { events: Ev[] }) {
  if (events.length === 0) {
    return (
      <section className="wa-kit-card">
        <h2 className="wa-text-lg wa-font-bold" style={{ marginBottom: '0.35rem' }}>
          Partner workflow activity
        </h2>
        <p className="wa-text-sm" style={{ color: 'var(--wa-muted)', margin: 0 }}>
          Outreach, owner changes, and milestones will show here.
        </p>
      </section>
    );
  }

  return (
    <section className="wa-kit-card">
      <h2 className="wa-text-lg wa-font-bold" style={{ marginBottom: '0.85rem' }}>
        Partner workflow activity
      </h2>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        {events.map((e) => (
          <li
            key={e.id}
            style={{
              display: 'flex',
              gap: '0.75rem',
              paddingBottom: '0.85rem',
              borderBottom: '1px solid var(--wa-border)',
            }}
          >
            <span
              aria-hidden
              style={{
                marginTop: '0.35rem',
                width: 9,
                height: 9,
                borderRadius: 999,
                background: 'var(--wa-accent)',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                className="wa-text-xs wa-font-bold wa-uppercase"
                style={{ letterSpacing: '0.06em', color: 'var(--wa-muted)' }}
              >
                {e.kind.replace(/_/g, ' ')}
              </div>
              <div className="wa-text-sm wa-font-semibold" style={{ color: 'var(--wa-text)' }}>
                {e.headline}
              </div>
              {e.detail ? (
                <div className="wa-text-sm" style={{ color: 'var(--wa-muted)', marginTop: '0.15rem' }}>
                  {e.detail}
                </div>
              ) : null}
              <div className="wa-text-xs" style={{ color: 'var(--wa-muted)', marginTop: '0.25rem' }}>
                {e.actorName ? <span>{e.actorName} · </span> : null}
                {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
