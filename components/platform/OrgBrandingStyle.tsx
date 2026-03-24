import { orgAccentCss, type OrgBranding } from '@/lib/platform/defaultOrgTheme';

/**
 * Only overrides global accent when the org has a custom primaryColor in the DB.
 * Otherwise `main.css` maroon/gold brand tokens apply (avoids forcing blue #2563eb).
 */
export default function OrgBrandingStyle({ branding }: { branding: OrgBranding }) {
  const accent = orgAccentCss(branding);
  if (!accent) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root { --org-accent: ${accent}; --color-accent: ${accent}; }`,
      }}
    />
  );
}
