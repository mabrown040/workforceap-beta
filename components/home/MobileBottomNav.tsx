'use client';

import Link from 'next/link';

export default function MobileBottomNav() {
  return (
    <nav
      className="wa-fixed wa-bottom-0 wa-left-0 wa-w-full wa-flex wa-justify-around wa-items-center wa-p-3 md:wa-hidden wa-z-50"
      style={{
        backgroundColor: 'rgba(28, 27, 27, 0.8)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(88, 65, 68, 0.15)',
      }}
    >
      <Link href="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#ad2c4d', backgroundColor: 'rgba(113, 51, 62, 0.2)', borderRadius: '0.75rem', padding: '0.25rem 1rem', textDecoration: 'none' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>Home</span>
      </Link>
      <Link href="/find-your-path" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#debfc2', textDecoration: 'none' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>Quiz</span>
      </Link>
      <Link href="/programs" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#debfc2', textDecoration: 'none' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>Programs</span>
      </Link>
      <Link href="/apply" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#debfc2', textDecoration: 'none' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>Apply</span>
      </Link>
    </nav>
  );
}
