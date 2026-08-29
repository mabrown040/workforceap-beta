export function resumePlainTextPreviewHtml(text: string): string {
  const escaped = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  return `<div class="resume-plain-text"><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;margin:0">${escaped}</pre></div>`;
}
