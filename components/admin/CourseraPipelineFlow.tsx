type CourseraPipelineFlowProps = {
  variant?: 'full' | 'compact';
};

const NODES_FULL = [
  { key: 'stmt', label: 'XapiStatement', sub: 'Inbound statements stored' },
  { key: 'map', label: 'Identity match', sub: 'Mapping + email match' },
  { key: 'cp', label: 'CourseProgress', sub: 'Per-course % & status' },
  { key: 'dash', label: 'Member dashboard', sub: 'Training + certificates' },
] as const;

export default function CourseraPipelineFlow({ variant = 'full' }: CourseraPipelineFlowProps) {
  const compact = variant === 'compact';
  const nodes = NODES_FULL;

  return (
    <div className={`coursera-pipeline-flow coursera-pipeline-flow--${variant}`} role="img" aria-label="Data flow from xAPI statements to member dashboard">
      <div className="coursera-pipeline-flow__track">
        {nodes.map((node, i) => (
          <div key={node.key} className="coursera-pipeline-flow__segment">
            <div className={`coursera-pipeline-flow__node${compact ? ' coursera-pipeline-flow__node--compact' : ''}`}>
              <span className="coursera-pipeline-flow__node-label">{node.label}</span>
              {!compact ? <span className="coursera-pipeline-flow__node-sub">{node.sub}</span> : null}
            </div>
            {i < nodes.length - 1 ? (
              <span className="coursera-pipeline-flow__connector" aria-hidden>
                <svg width="24" height="16" viewBox="0 0 24 16" className="coursera-pipeline-flow__connector-svg">
                  <path
                    d="M2 8h16M14 3l5 5-5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
