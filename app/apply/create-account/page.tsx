import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import ApplyCreateAccountForm from './ApplyCreateAccountForm';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Create Your Account',
    description: 'Create your account to save your program choice and receive your next steps.',
    path: '/apply/create-account',
  }),
  robots: { index: false, follow: false },
};

export default function ApplyCreateAccountPage() {
  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Step 3 of 3 — create your account</h1>
          <p>Create your account to save your program choice, view updates, and help us follow up with your next steps within 24–48 hours.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <ApplyCreateAccountForm />
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
