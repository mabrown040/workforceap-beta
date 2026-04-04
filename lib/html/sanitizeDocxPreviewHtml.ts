/**
 * Server-side cleanup for Mammoth HTML before iframe preview.
 * Mammoth should not emit scripts, but a crafted DOCX can still yield risky markup.
 */
export function sanitizeDocxPreviewHtml(html: string): string {
  let out = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  out = out.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/\s+href\s*=\s*(["']?)\s*javascript:/gi, ' href=$1#blocked');
  return out;
}
