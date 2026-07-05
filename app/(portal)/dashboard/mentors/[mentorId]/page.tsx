import { redirect } from 'next/navigation';
import MentorSessionForm from '@/components/portal/MentorSessionForm';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { MemberMentorProfileKit } from '@/components/portal/kit/pages/member/MemberMentorProfileKit';

export default async function MentorProfilePage({ params }: { params: Promise<{ mentorId: string }> }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/mentors');

  const { mentorId } = await params;
  const mentor = await prisma.mentor.findFirst({
    where: { id: mentorId, isActive: true, approvedAt: { not: null } },
    select: { id: true, fullName: true, title: true, company: true, industry: true, bio: true, linkedinUrl: true },
  });

  if (!mentor || !mentor.id) redirect('/dashboard/mentors');

  return (
    <MemberMentorProfileKit
      mentor={mentor}
      sessionForm={<MentorSessionForm mentorId={mentor.id} />}
    />
  );
}
