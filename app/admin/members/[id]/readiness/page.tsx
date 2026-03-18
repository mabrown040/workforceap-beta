import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import ReadinessCounselorClient from './ReadinessCounselorClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Readiness Checklist',
  description: 'Job readiness checklist.',
  path: '/admin/members',
});

export default async function AdminMemberReadinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const { id } = await params;

  const member = await prisma.user.findUnique({
    where: { id },
  });

  if (!member || member.deletedAt) notFound();

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href={`/admin/members/${id}`} style={{ color: 'var(--color-accent)', marginBottom: '0.5rem', display: 'inline-block' }}>
            ← Back to {member.fullName}
          </Link>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Job Readiness Checklist</h1>
          <p style={{ color: 'var(--color-gray-600)' }}>{member.email}</p>
        </div>
      </div>
      <ReadinessCounselorClient memberId={id} />
    </div>
  );
}
