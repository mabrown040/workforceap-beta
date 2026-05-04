import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import WalkInSessionClient from '@/components/portal/sessions/WalkInSessionClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Walk-In Session',
  description: 'Create a new member and run a guided 30-minute session — resume, cover letter, interview prep, all in one.',
  path: '/counselor/sessions/walk-in',
});

export default async function WalkInSessionPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/sessions/walk-in');

  const [counselorRole, adminRole] = await Promise.all([isCounselor(user.id), isAdmin(user.id)]);
  // Admins who aren't counselors belong in admin chrome, not counselor chrome
  if (!counselorRole) {
    if (adminRole) redirect('/admin/sessions/walk-in');
    redirect('/dashboard');
  }

  return (
    <>
      <PageHeader
        title="Walk-In Session"
        subtitle="Brand new member sitting with you. Start with their basics — we'll create their account and walk through resume, cover letter, and interview prep together."
        breadcrumbs={[
          { label: 'Counselor', href: '/counselor' },
          { label: 'In-Office Sessions', href: '/counselor/sessions' },
          { label: 'Walk-In Session' },
        ]}
      />
      <WalkInSessionClient counselorName={user.email ?? 'your counselor'} />
    </>
  );
}
