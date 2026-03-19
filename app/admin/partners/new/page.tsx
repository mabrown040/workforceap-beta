import Link from 'next/link';
import NewPartnerForm from './NewPartnerForm';

export default function NewPartnerPage() {
  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link href="/admin/partners" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
        ← Back to Partners
      </Link>
      <h1 style={{ marginBottom: '1.5rem' }}>Add Partner Organization</h1>
      <NewPartnerForm />
    </div>
  );
}