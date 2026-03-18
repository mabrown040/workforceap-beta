import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { PROGRAMS } from '@/lib/content/programs';
import AddMemberWizard from './AddMemberWizard';

export const metadata: Metadata = buildPageMetadata({
  title: 'Add Member',
  description: 'Create a new member account.',
  path: '/admin/members',
});

export default async function AddMemberPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members/new');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link
        href="/admin/members"
        style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← Back to Members
      </Link>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Add Member</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Multi-step onboarding. All WIOA fields required for grant reporting.
      </p>
      <AddMemberWizard programs={PROGRAMS} />
    </div>
  );
}
