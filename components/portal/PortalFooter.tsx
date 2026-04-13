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
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/contact">Contact</Link>
      </p>
    </footer>
  );
}
