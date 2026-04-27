import Link from 'next/link';

/** Minimal legal strip for portal routes — not the full marketing Footer. */
export default function PortalFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="portal-minimal-footer" role="contentinfo">
      <p className="portal-minimal-footer__inner">
        <span>© {year} Workforce Advancement Project</span>
        <span className="portal-minimal-footer__sep" aria-hidden>
          |
        </span>
        {/* Padded to >=44x44 tap target on mobile (audit #89). */}
        <Link href="/privacy" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0.75rem', justifyContent: 'center' }}>Privacy</Link>
        <Link href="/terms" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0.75rem', justifyContent: 'center' }}>Terms</Link>
        <Link href="/contact" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0.75rem', justifyContent: 'center' }}>Contact</Link>
      </p>
    </footer>
  );
}
