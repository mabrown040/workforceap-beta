import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import WalkInSessionClient from '@/components/portal/sessions/WalkInSessionClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Walk-in session',
  description: 'Create a new member and run a guided 30-minute session — resume, cover letter, interview prep, all in one.',
  path: '/counselor/sessions/walk-in',
});

export default async function WalkInSessionPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/sessions/walk-in');

  const [counselorRole, adminRole] = await Promise.all([isCounselor(user.id), isAdmin(user.id)]);
  if (!counselorRole && !adminRole) redirect('/dashboard');

  return (
    <>
      <PageHeader
        title="Walk-in session"
        subtitle="Brand new member sitting with you. Start with their basics — we&rsquo;ll create their account and walk through resume, cover letter, and interview prep together."
        breadcrumbs={[
          { label: 'Counselor', href: '/counselor' },
          { label: 'In-office sessions', href: '/counselor/sessions' },
          { label: 'Walk-in' },
        ]}
      />
      <WalkInSessionClient counselorName={user.email ?? 'your counselor'} />
    </>
  );
}
