import { orgAccentCss, type OrgBranding } from '@/lib/platform/defaultOrgTheme';

export default function OrgBrandingStyle({ branding }: { branding: OrgBranding }) {
  const accent = orgAccentCss(branding);
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root { --org-accent: ${accent}; --color-accent: ${accent}; }`,
      }}
    />
  );
}
