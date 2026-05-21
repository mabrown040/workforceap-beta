'use client';

import dynamic from 'next/dynamic';

const ProgressDistributionChart = dynamic(
  () => import('./ProgressDistributionChart'),
  {
    ssr: false,
    loading: () => (
      <div
        className="portal-card portal-card--flat"
        style={{ minHeight: '12rem', borderRadius: '0.875rem' }}
        aria-hidden
      />
    ),
  }
);

export default ProgressDistributionChart;
