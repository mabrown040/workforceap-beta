import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
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
        <div className="page-hero-content">
          <Link href="/dashboard/ai-tools" className="resource-back-link">← Back to AI Tools</Link>
          <h1>Salary Negotiation Script</h1>
          <p>You got an offer—now negotiate. Enter your numbers and get an exact script for a phone call or email.</p>
        </div>
      </section>
      <section className="content-section">
        <div className="container">
          <div className="ai-tool-page" style={{ maxWidth: '720px' }}>
            <SalaryNegotiationForm />
          </div>
        </div>
      </section>
    </div>
  );
}
