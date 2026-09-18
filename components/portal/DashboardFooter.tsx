import Link from 'next/link';

/**
 * Minimal legal / contact links for portal dashboards.
 * In-flow at the end of `.workspace-shell-main-inner` — never sticky/fixed.
 * Replaces the marketing site footer inside dashboard routes.
 */
export default function DashboardFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="dashboard-site-footer">
      <div className="dashboard-site-footer__inner">
        <p>© {year} Workforce Advancement Project</p>
        {/* Footer links padded to >=44px tap targets on mobile (audit #89). */}
        <nav aria-label="Footer">
          <Link prefetch={false} href="/privacy">
            Privacy
          </Link>
          <Link prefetch={false} href="/terms">
            Terms
          </Link>
          <Link prefetch={false} href="/contact">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
