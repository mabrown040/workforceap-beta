'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import Footer from '@/components/Footer';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
  }, [error]);

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
        <p className="app-system-page__eyebrow">Something went wrong</p>
        <h1 className="app-system-page__title">We couldn&apos;t load this page</h1>
        <p className="app-system-page__text">
          Please try again. If it keeps happening, contact{' '}
          <a href="mailto:info@workforceap.org">info@workforceap.org</a>
          {error.digest ? (
            <>
              {' '}
              and mention reference <strong className="app-system-page__digest">{error.digest}</strong>.
            </>
          ) : (
            '.'
          )}
        </p>
        <div className="app-system-page__actions">
          <button type="button" onClick={() => reset()} className="btn btn-primary">
            Try again
          </button>
          <Link href="/" className="btn btn-outline">
            Back to home
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
