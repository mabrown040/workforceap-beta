'use client';

import { useTranslations } from 'next-intl';

export default function AdminChartsLoading() {
  const t = useTranslations('admin');
  return (
    <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <div
        className="loading-spinner"
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--outline-variant)',
          borderTop: '3px solid var(--color-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 1rem',
        }}
      />
      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.95rem' }}>
        {t('loadingCharts')}
      </p>
    </div>
  );
}
