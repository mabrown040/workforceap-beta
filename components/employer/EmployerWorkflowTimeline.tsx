type Ev = {
  id: string;
  createdAt: string;
  kind: string;
  headline: string;
  detail: string | null;
  actorName: string | null;
};

export default function EmployerWorkflowTimeline({ events }: { events: Ev[] }) {
  if (events.length === 0) {
    return (
      <section className="employer-workflow-timeline employer-dash-panel">
        <h2 className="employer-workflow-timeline-title">Workflow activity</h2>
        <p style={{ color: 'var(--color-gray-600)', margin: 0 }}>Status changes and notes will appear here as your team works applications and jobs.</p>
      </section>
    );
  }

  return (
    <section className="employer-workflow-timeline employer-dash-panel">
      <h2 className="employer-workflow-timeline-title">Workflow activity</h2>
      <ul className="employer-workflow-timeline-list">
        {events.map((e) => (
          <li key={e.id} className="employer-workflow-timeline-item">
            <div className="employer-workflow-timeline-dot" aria-hidden />
            <div>
              <div className="employer-workflow-timeline-kind">{e.kind.replace(/_/g, ' ')}</div>
              <div className="employer-workflow-timeline-headline">{e.headline}</div>
              {e.detail ? <div className="employer-workflow-timeline-detail">{e.detail}</div> : null}
              <div className="employer-workflow-timeline-meta">
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
