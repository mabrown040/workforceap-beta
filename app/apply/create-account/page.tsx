import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import ApplyCreateAccountForm from './ApplyCreateAccountForm';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Save Your Spot and Create Your Login',
    description: 'Create your account to save your ranked program choices and connect with your next steps.',
    path: '/apply/create-account',
  }),
  robots: { index: false, follow: false },
};

export default function ApplyCreateAccountPage() {
  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Step 3 of 3 — save your spot and create your login</h1>
          <p>Create your account to save your ranked program choices, track your progress, and connect with counselor support. Start with the basics now. You can add more profile details later if we need them. Our team will follow up within 1–2 business days with your next step.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <Suspense fallback={<p>Loading…</p>}>
              <ApplyCreateAccountForm />
            </Suspense>
            <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              Already have an account? <a href="/login">Log in</a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
