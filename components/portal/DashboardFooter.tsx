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
        borderTop: '1px solid var(--color-border, #e5e5e5)',
        background: '#fafafa',
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
          color: 'var(--color-gray-600, #525252)',
        }}
      >
        <p style={{ margin: 0 }}>© {year} Workforce Advancement Project</p>
        <nav aria-label="Footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
