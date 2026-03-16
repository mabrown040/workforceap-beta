import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import Footer from '@/components/Footer';
import ProfileForm from '@/components/portal/ProfileForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'Profile',
  description: 'View and edit your member profile.',
  path: '/profile',
});

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/profile');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Profile</h1>
          <p>Manage your contact information and preferences.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '560px' }}>
            <ProfileForm
              initialUser={{
                email: dbUser?.email ?? user.email ?? '',
                fullName: dbUser?.fullName ?? 'Member',
                phone: dbUser?.phone ?? null,
              }}
              initialProfile={
                dbUser?.profile
                  ? {
                      address: dbUser.profile.address,
                      city: dbUser.profile.city,
                      state: dbUser.profile.state,
                      zip: dbUser.profile.zip,
                    }
                  : null
              }
            />
            <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
              <a href="/account">Account settings</a> — update password, email preferences
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
