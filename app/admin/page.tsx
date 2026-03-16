import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin',
  description: 'Admin dashboard.',
  path: '/admin',
});

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Admin</h1>
          <p>Manage members and view metrics.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <Link href="/admin/members" className="btn btn-primary" style={{ padding: '1rem', textAlign: 'center' }}>
              Member applications
            </Link>
            <Link href="/admin/metrics" className="btn btn-outline" style={{ padding: '1rem', textAlign: 'center' }}>
              Engagement metrics
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
