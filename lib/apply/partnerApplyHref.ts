import { normalizePartnerRef } from '@/lib/partner/sponsoredEnrollment';

/** `/apply` with a partner ref, optionally pinning a program. */
export function partnerApplyHref(ref: string | null | undefined, programSlug?: string): string {
  const code = normalizePartnerRef(ref);
  const program = programSlug?.trim();
  if (!code) {
    return program ? `/apply?program=${encodeURIComponent(program)}` : '/apply';
  }
  const base = `/apply?ref=${encodeURIComponent(code)}`;
  return program ? `${base}&program=${encodeURIComponent(program)}` : base;
}

/** Program marketing page that keeps the school/partner ref on Apply. */
export function partnerProgramHref(ref: string | null | undefined, programSlug: string): string {
  const slug = programSlug.trim();
  const path = `/programs/${encodeURIComponent(slug)}`;
  const code = normalizePartnerRef(ref);
  return code ? `${path}?ref=${encodeURIComponent(code)}` : path;
}
