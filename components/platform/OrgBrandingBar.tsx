import Image from 'next/image';
import type { OrgBranding } from '@/lib/platform/defaultOrgTheme';

/** Thin branded strip when org logo is configured (optional visual cue for white-label). */
export default function OrgBrandingBar({ branding }: { branding: OrgBranding }) {
  const logo = branding.logo?.trim();
  if (!logo) return null;
  return (
    <div className="org-branding-bar">
      <Image
        src={logo}
        alt=""
        width={120}
        height={36}
        className="org-branding-bar__logo"
        sizes="120px"
      />
    </div>
  );
}
