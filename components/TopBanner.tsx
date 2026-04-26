import Link from 'next/link';

export default function TopBanner() {
  return (
    <div className="top-banner">
      <div className="top-banner-inner">
        <span>No-cost career training, certificates, and support for <Link href="/wioa-qualification" style={{ color: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}>qualifying members</Link>.</span>
        <Link href="/apply" className="banner-link">Explore programs and apply today.</Link>
      </div>
    </div>
  );
}
