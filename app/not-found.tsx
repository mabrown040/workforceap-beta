import Link from 'next/link';
import Footer from '@/components/Footer';

export default function NotFound() {
  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Page Not Found</h1>
          <p>The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.</p>
          <div className="not-found-actions">
            <Link href="/" className="btn btn-primary">Go to Homepage</Link>
            <Link href="/programs" className="btn btn-outline">Browse Programs</Link>
            <Link href="/apply" className="btn btn-outline">Apply Now</Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
