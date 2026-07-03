'use client';

import dynamic from 'next/dynamic';
import AdminChartsLoading from '@/components/admin/AdminChartsLoading';

const AIEfficacyDashboard = dynamic(
  () => import('./AIEfficacyDashboard'),
  {
    ssr: false,
    // Reuse the shared chart-loading spinner (matches AdminAnalyticsChartsLazy)
    // instead of ad hoc plain text, so lazy-chart loading looks the same
    // across analytics surfaces.
    loading: AdminChartsLoading,
  }
);

export default AIEfficacyDashboard;
