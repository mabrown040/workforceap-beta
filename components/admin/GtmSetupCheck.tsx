'use client';

import React from 'react';

function gtmStatus(): { status: 'ok' | 'warning' | 'missing'; label: string; details: string } {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  if (!gtmId) {
    return {
      status: 'missing',
      label: 'GTM not configured',
      details: 'NEXT_PUBLIC_GTM_ID is not set. GTM container will not load. Add it in Vercel dashboard or .env.local.',
    };
  }
  return {
    status: 'ok',
    label: 'GTM configured',
    details: `GTM ID: ${gtmId}. Container will load on page views.`,
  };
}

export default function GtmSetupCheck() {
  const { status, label, details } = gtmStatus();

  const borderColor =
    status === 'ok' ? 'rgba(128,217,159,0.35)' : status === 'warning' ? 'rgba(251,191,36,0.35)' : 'rgba(173,44,77,0.35)';
  const iconColor =
    status === 'ok' ? '#80d99f' : status === 'warning' ? '#fbbf24' : '#ad2c4d';
  const icon = status === 'ok' ? 'check_circle' : status === 'warning' ? 'warning' : 'error';

  return (
    <div
      className="portal-alert"
      style={{ margin: '0 1.5rem 1.25rem', borderColor }}
    >
      <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: '1.125rem', marginRight: '0.5rem' }} aria-hidden="true">
        {icon}
      </span>
      <span className="portal-alert__label">
        {label}
      </span>
      <span className="portal-alert__details" style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
        {details}
      </span>
    </div>
  );
}
