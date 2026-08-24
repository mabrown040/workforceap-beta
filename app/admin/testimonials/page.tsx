import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import TestimonialsAdminClient from '@/components/admin/TestimonialsAdminClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Testimonials',
    description: 'Review and publish member testimonials.',
    path: '/admin/testimonials',
  });
}

export default async function AdminTestimonialsPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  return (
    <PortalPageFrame>
      <PageHeader
        title="Testimonials"
        subtitle="Review member success stories and manage publication status"
      />
      <TestimonialsAdminClient />
    </PortalPageFrame>
  );
}
