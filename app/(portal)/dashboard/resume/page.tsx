import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getProfileCompleteness } from '@/lib/resume/profileCompleteness';
import Footer from '@/components/Footer';
import ResumeClient from './ResumeClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Resume',
  description: 'Upload, generate, and manage your resume.',
  path: '/dashboard',
});

export default async function DashboardResumePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/resume');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });

  if (!dbUser) redirect('/login');

  const program = dbUser.enrolledProgram ? getProgramBySlug(dbUser.enrolledProgram) : null;
  const completeness = getProfileCompleteness(dbUser.profile, dbUser);

  const witData = {
    name: dbUser.fullName ?? '',
    email: dbUser.email,
    phone: dbUser.phone ?? dbUser.profile?.profilePhone ?? '',
    recentEmployer: '—', // would need work history
    targetJob: program?.title ?? dbUser.enrolledProgram ?? 'Target role',
    skills: program?.skills?.join(', ') ?? '—',
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Resume</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Upload your resume, generate an AI-enhanced version, and prepare for WorkInTexas.
      </p>
      <ResumeClient
        completeness={completeness}
        witData={witData}
        hasOriginal={!!dbUser.profile?.resumeOriginalPath}
        hasEnhanced={!!dbUser.profile?.resumeEnhancedPath}
      />
      <Footer />
    </div>
  );
}
