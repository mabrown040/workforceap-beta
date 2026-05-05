/**
 * Small inline illustration for empty admin lists — matches WorkforceAP accent + blue.
 */
export function DataLandingEmptyArt({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="112"
      height="72"
      viewBox="0 0 112 72"
      aria-hidden
      focusable="false"
    >
      <rect x="8" y="12" width="96" height="48" rx="6" fill="rgba(43,123,185,0.08)" stroke="var(--color-blue)" strokeWidth="1" />
      <circle cx="36" cy="36" r="10" fill="rgba(196,30,58,0.12)" stroke="var(--color-accent)" strokeWidth="1.25" />
      <path d="M36 31v10M31 36h10" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="54" y="28" width="38" height="4" rx="1" fill="var(--outline-variant)" opacity="0.6" />
      <rect x="54" y="36" width="28" height="4" rx="1" fill="var(--outline-variant)" opacity="0.45" />
      <rect x="54" y="44" width="32" height="4" rx="1" fill="var(--outline-variant)" opacity="0.35" />
    </svg>
  );
}
