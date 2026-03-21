import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <div className="app-system-page">
      <div className="app-system-page__inner container">
        <Link href="/" className="app-system-page__logo-link" aria-label="Workforce Advancement Project home">
          <Image
            src="/images/logo-tight.png"
            alt=""
            width={1930}
            height={985}
            className="app-system-page__logo"
            sizes="180px"
            quality={85}
          />
        </Link>
        <p className="app-system-page__eyebrow">404</p>
        <h1 className="app-system-page__title">Page not found</h1>
        <p className="app-system-page__text">
          The link may be broken or the page may have moved. Try one of the options below, or email{' '}
          <a href="mailto:info@workforceap.org">info@workforceap.org</a> if you need help.
        </p>
        <div className="app-system-page__actions">
          <Link href="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link href="/apply" className="btn btn-outline">
            Apply for training
          </Link>
          <Link href="/contact" className="btn btn-ghost">
            Contact us
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
