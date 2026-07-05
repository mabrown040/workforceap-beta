'use client';

import { useTranslations } from 'next-intl';
import { Spinner } from '@astryxdesign/core/Spinner';

export default function AdminChartsLoading() {
  const t = useTranslations('admin');
  return (
    <div style={{ padding: '3rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
      <Spinner size="lg" label={t('loadingCharts')} />
    </div>
  );
}
