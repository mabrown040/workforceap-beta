import NewPartnerForm from './NewPartnerForm';
import PageHeader from '@/components/portal/PageHeader';
import { PROGRAMS } from '@/lib/content/programs';

export default function NewPartnerPage() {
  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <PageHeader
        breadcrumbs={[{ label: 'Partners', href: '/admin/partners' }, { label: 'New Partner' }]}
        title="Add Partner Organization"
      />
      <NewPartnerForm programs={PROGRAMS.map((p) => ({ slug: p.slug, title: p.title }))} />
    </div>
  );
}