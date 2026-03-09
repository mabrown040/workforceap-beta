import Link from 'next/link';

export default function TopBanner() {
  return (
    <div className="top-banner">
      <div className="top-banner-inner">
        <span>Career training, certifications, and support.</span>
        <Link href="/apply" className="banner-link">Explore programs and apply today.</Link>
      </div>
    </div>
  );
}
