import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import Footer from '@/components/Footer';
import { MemberReviewTable } from '@/components/admin/MemberReviewTable';
import { SignOutButton } from '@/components/portal/SignOutButton';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Member review',
  description: 'Review and manage member applications.',
  path: '/admin/members',
});

export default async function AdminMembersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const applications = await prisma.application.findMany({
    orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }],
    include: {
      user: {
        select: { id: true, fullName: true, email: true, phone: true },
      },
    },
  });

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Member applications</h1>
            <p>Review and approve or deny member signups.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/dashboard" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}>
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <MemberReviewTable applications={applications} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
