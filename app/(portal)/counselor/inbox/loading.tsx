export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        color: 'var(--color-on-surface-variant)',
      }}
    >
      Loading inbox…
    </div>
  );
}
