import type { OrgBranding } from '@/lib/platform/defaultOrgTheme';

/** Thin branded strip when org logo is configured (optional visual cue for white-label). */
export default function OrgBrandingBar({ branding }: { branding: OrgBranding }) {
  if (!branding.logo?.trim()) return null;
  return (
    <div
      className="org-branding-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '0.35rem 1rem',
        background: 'var(--color-light, #f5f5f5)',
        borderBottom: '1px solid var(--outline-variant)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={branding.logo} alt="" width={120} height={36} style={{ maxHeight: 36, width: 'auto', objectFit: 'contain' }} />
    </div>
  );
}
