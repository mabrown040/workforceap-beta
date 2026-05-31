import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getProgramBySlug } from '@/lib/content/programs';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import ReadinessCounselorClient from './ReadinessCounselorClient';
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Readiness Checklist',
  description: 'Job readiness checklist.',
  path: '/admin/members',
});
}

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
  const orgId = await getActorOrganizationId(user.id);

  const member = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!member || member.deletedAt) notFound();

  const program = member.enrolledProgram ? getProgramBySlug(member.enrolledProgram) : null;

  return (
    <div className="readiness-counselor-page">
      <div className="readiness-counselor-header">
        <div>
          <Link href={`/admin/members/${id}`} className="readiness-back-link">
            Back to {member.fullName}
          </Link>
          <h1 className="readiness-title">Career Readiness Checklist — {member.fullName}</h1>
          <p className="readiness-meta">Program: {program?.title ?? member.enrolledProgram ?? '—'}</p>
        </div>
      </div>
      <ReadinessCounselorClient
        memberId={id}
        memberName={member.fullName}
        programName={program?.title ?? member.enrolledProgram ?? '—'}
      />
    </div>
  );
}
