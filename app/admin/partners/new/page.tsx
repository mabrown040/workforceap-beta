import NewPartnerForm from './NewPartnerForm';
import PageHeader from '@/components/portal/PageHeader';

export default function NewPartnerPage() {
  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <PageHeader
        breadcrumbs={[{ label: 'Partners', href: '/admin/partners' }, { label: 'New Partner' }]}
        title="Add Partner Organization"
      />
      <NewPartnerForm />
    </div>
  );
}