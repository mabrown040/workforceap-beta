import { headers } from 'next/headers';
import { isCanonicalHost } from '@/lib/tenant/hostMatch';

const DEFAULT_SITE_URL = 'https://www.workforceap.org';

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return DEFAULT_SITE_URL;
  return raw.replace(/\/$/, '');
}

export async function isStagingDeployment(): Promise<boolean> {
  if (process.env.VERCEL_ENV === 'production') {
    return false;
  }

  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return true;
  }

  const h = await headers();
  const host = h.get('x-wap-host') ?? h.get('host');
  if (host && !isCanonicalHost(host)) {
    return true;
  }
  if (host?.endsWith('.vercel.app')) {
    return true;
  }

  const deploymentUrl = h.get('x-vercel-deployment-url');
  if (deploymentUrl && !deploymentUrl.includes('workforceap.org')) {
    return true;
  }

  return false;
}

export function buildOgImageUrl(title: string, description?: string): string {
  const params = new URLSearchParams({ title });
  if (description) {
    params.set('description', description.slice(0, 200));
  }
  return `${getSiteUrl()}/api/og?${params.toString()}`;
}
