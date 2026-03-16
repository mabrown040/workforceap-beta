import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import LinkedInAboutForm from '@/components/portal/tools/LinkedInAboutForm';

export const metadata = buildPageMetadata({
  title: 'LinkedIn About Section Generator',
  description: 'Create a polished LinkedIn About section from your role and key points.',
  path: '/ai-tools/linkedin-about',
});

export default async function LinkedInAboutPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/ai-tools/linkedin-about');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/ai-tools" className="resource-back-link">← Back to AI Tools</Link>
            <h1>LinkedIn About Section Generator</h1>
            <p>Give us your role and a few bullets about yourself. We&apos;ll write a polished 3-paragraph About section ready to paste.</p>
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
          <div className="ai-tool-page" style={{ maxWidth: '720px' }}>
            <LinkedInAboutForm />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
