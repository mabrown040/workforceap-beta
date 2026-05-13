import PageHeader from '@/components/portal/PageHeader';

export default function Loading() {
  return (
    <>
      <PageHeader title="Webhook Events" subtitle="Loading…" />
      <div style={{ padding: '2rem', color: 'var(--color-on-surface-variant)' }}>Loading webhook events…</div>
    </>
  );
}
