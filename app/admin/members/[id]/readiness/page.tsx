import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getProgramBySlug } from '@/lib/content/programs';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';
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

  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  const { id } = await params;
  const member = await withAdminPageScope(scope, (db) =>
    db.user.findFirst({ where: { id } }),
  );

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
