'use client';

import dynamic from 'next/dynamic';
import AdminChartsLoading from './AdminChartsLoading';

const AdminAnalyticsCharts = dynamic(
  () => import('./AdminAnalyticsCharts'),
  {
    ssr: false,
    loading: AdminChartsLoading,
  }
);

export default AdminAnalyticsCharts;
