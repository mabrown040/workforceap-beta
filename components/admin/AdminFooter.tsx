export default function AdminFooter() {
  return (
    <footer
      className="admin-footer"
      style={{
        borderTop: '1px solid var(--color-gray-200)',
        padding: '0.75rem 1.5rem',
        marginTop: 'auto',
        fontSize: '0.8125rem',
        color: 'var(--color-gray-600)',
        background: 'var(--color-white)',
      }}
    >
      © 2026 Workforce Advancement Project
      <span style={{ margin: '0 0.35rem', color: 'var(--color-gray-300)' }}>|</span>
      Support:{' '}
      <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-blue)', textDecoration: 'none' }}>
        info@workforceap.org
      </a>
    </footer>
  );
}
