import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Help & Support',
  description: 'Request access to member benefits and get support.',
  path: '/dashboard/help',
});

export default async function DashboardHelpPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/help');

  return (
    <>
      <div className="inner-page wa-pb-24 md:wa-pb-8">
        <section className="page-hero">
          <div
            className="page-hero-content"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}
          >
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <PortalBreadcrumb
                  variant="on-dark"
                  items={[
                    { href: '/dashboard', label: 'Dashboard' },
                    { label: 'Help & Support' },
                  ]}
                />
              </div>
              <h1>Help & Support</h1>
              <p>Request access to member benefits or get assistance.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link href="/dashboard" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}>
                Dashboard
              </Link>
              <SignOutButton />
            </div>
          </div>
        </section>

        <section className="content-section">
          <div className="container">
            <div className="help-request-card">
              <h2>Request Benefit Access</h2>
              <p>
                To request access to LinkedIn Premium or Coursera, please contact your WorkforceAP counselor or email{' '}
                <a href="mailto:info@workforceap.org">info@workforceap.org</a> with your name and the benefit you&apos;d like to request.
              </p>
              <p>We&apos;ll process your request and follow up within 2–3 business days.</p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
