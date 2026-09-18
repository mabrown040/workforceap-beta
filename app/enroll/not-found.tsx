import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'School enrollment page not found',
  robots: { index: false, follow: false },
};

/**
 * Friendly not-found for `/enroll/[school]` when the partner slug is unknown,
 * inactive, or unpublished — avoids the generic Next error shell.
 */
export default function EnrollSchoolNotFound() {
  return (
    <div className="app-system-page">
      <div className="app-system-page__inner container">
        <Link href="/" className="app-system-page__logo-link" aria-label="Workforce Advancement Project home">
          <Image
            src="/images/wap_logo.png"
            alt="WorkforceAP logo"
            width={180}
            height={92}
            className="app-system-page__logo"
            sizes="180px"
            quality={85}
          />
        </Link>
        <p className="app-system-page__eyebrow">School enrollment</p>
        <h1 className="app-system-page__title">We couldn&apos;t find that school page</h1>
        <p className="app-system-page__text">
          The enrollment link may be mistyped, expired, or not published yet. You can still apply for training
          directly, browse programs, or contact us for the correct school link.
        </p>
        <div className="app-system-page__actions">
          <Link href="/apply" className="btn btn-primary">
            Apply for training
          </Link>
          <Link href="/programs" className="btn btn-outline">
            Browse programs
          </Link>
          <Link href="/contact" className="btn btn-app-system-ghost">
            Contact us
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
