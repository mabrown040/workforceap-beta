import Link from 'next/link';

/**
 * Minimal legal / contact links for the member dashboard.
 * Replaces the marketing site footer inside dashboard routes.
 */
export default function DashboardFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="dashboard-site-footer"
      style={{
        background: 'var(--surface-container-lowest)',
        marginTop: 'auto',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem 1.25rem',
          padding: '1rem 1.5rem',
          fontSize: '0.8125rem',
          color: 'var(--color-on-surface-variant)',
        }}
      >
        <p style={{ margin: 0 }}>© {year} Workforce Advancement Project</p>
        {/* Footer links padded to >=44px tap targets on mobile (audit #89). */}
        <nav aria-label="Footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          <Link prefetch={false} href="/privacy" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0.75rem', justifyContent: 'center' }}>Privacy</Link>
          <Link prefetch={false} href="/terms" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0.75rem', justifyContent: 'center' }}>Terms</Link>
          <Link prefetch={false} href="/contact" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0.75rem', justifyContent: 'center' }}>Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
