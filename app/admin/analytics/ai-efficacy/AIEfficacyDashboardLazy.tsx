'use client';

import dynamic from 'next/dynamic';

const AIEfficacyDashboard = dynamic(
  () => import('./AIEfficacyDashboard'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
        Loading charts…
      </div>
    ),
  }
);

export default AIEfficacyDashboard;
