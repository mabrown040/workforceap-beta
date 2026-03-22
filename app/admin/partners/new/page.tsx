import Link from 'next/link';
import NewPartnerForm from './NewPartnerForm';
import PageHeader from '@/components/portal/PageHeader';

export default function NewPartnerPage() {
  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link href="/admin/partners" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
        ← Back to Partners
      </Link>
      <PageHeader title="Add Partner Organization" />
      <NewPartnerForm />
    </div>
  );
}