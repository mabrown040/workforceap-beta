import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import SalaryNegotiationForm from '@/components/portal/tools/SalaryNegotiationForm';

export const metadata = buildPageMetadata({
  title: 'Salary Negotiation Script',
  description: 'Get a word-for-word script to negotiate your offer—phone or email.',
  path: '/dashboard/ai-tools/salary-negotiation',
});

export default async function SalaryNegotiationPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/salary-negotiation');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/dashboard/ai-tools" className="resource-back-link">← Back to AI Tools</Link>
            <h1>Salary Negotiation Script</h1>
            <p>You got an offer—now negotiate. Enter your numbers and get an exact script for a phone call or email.</p>
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
            <SalaryNegotiationForm />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
