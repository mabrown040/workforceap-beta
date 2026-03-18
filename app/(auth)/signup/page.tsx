import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import MemberSignupForm from '@/components/forms/MemberSignupForm';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Member signup',
    description: 'Create your WorkforceAP member account to apply for programs and track your progress.',
    path: '/signup',
  }),
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Create your member account</h1>
          <p>Sign up to apply for programs, track your application status, and access member resources.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="two-col" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="col">
              <h2>Why create an account?</h2>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                {[
                  'Apply for career programs',
                  'Track your application status',
                  'Access member resources and documents',
                  'Get personalized next steps',
                ].map((item, i) => (
                  <li key={i} style={{ padding: '.75rem 0', borderBottom: i < 3 ? '1px solid var(--color-gray-200)' : 'none', display: 'flex', gap: '.75rem' }}>
                    <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>&#10003;</span> {item}
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: '1.5rem', color: 'var(--color-gray-600)', fontSize: '.9rem' }}>
                Already have an account? <Link href="/login">Log in</Link>
              </p>
            </div>
            <div className="col">
              <div className="apply-form">
                <MemberSignupForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
