type BucketName = 'employer-logos' | 'organization-branding';

function getSupabasePublicBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export function resolveSupabasePublicAssetUrl(bucket: BucketName, value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = getSupabasePublicBaseUrl();
  if (!base) return trimmed;
  return `${base}/storage/v1/object/public/${bucket}/${trimmed.replace(/^\/+/, '')}`;
}
