import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import ApplyCreateAccountForm from './ApplyCreateAccountForm';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Create Your Account',
    description: 'Create your account to save your spot.',
    path: '/apply/create-account',
  }),
  robots: { index: false, follow: false },
};

export default function ApplyCreateAccountPage() {
  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>You&apos;re almost in</h1>
          <p>Create your account to save your spot.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
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
