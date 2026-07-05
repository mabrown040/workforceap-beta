import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { MemberMentorsKit } from '@/components/portal/kit/pages/member/MemberMentorsKit';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Find a Mentor',
  description: 'Browse WorkforceAP mentors and request a session with someone in your field.',
  path: '/dashboard/mentors',
});
}

export default async function MentorsBrowsePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/mentors');

  const mentors = await prisma.mentor.findMany({
    take: 500,
    where: { isActive: true, approvedAt: { not: null } },
    orderBy: { fullName: 'asc' },
    select: { id: true, fullName: true, title: true, company: true, industry: true },
  });

  return <MemberMentorsKit mentors={mentors} />;
}
