import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import PageHero from '@/components/PageHero';
import PartnerSignupForm from './PartnerSignupForm';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Partner organization registration',
  description:
    'Register your organization as a WorkforceAP community partner. Refer members to training offered at no cost to members and track outcomes in the partner portal.',
  path: '/partner-signup',
});
}

export default function PartnerSignupPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Register your organization as a WorkforceAP partner"
        subtitle="Partner organizations refer community members to WorkforceAP programs. There is no cost to register. We'll set up your partner portal account within 1–2 business days."
      />
      <section className="content-section">
        <div className="container" style={{ maxWidth: 560 }}>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Already a partner?{' '}
            <Link href="/login?redirectTo=/partner" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              Sign in
            </Link>
            .
          </p>
          <PartnerSignupForm />
        </div>
      </section>
      <Footer />
    </div>
  );
}
