/** Best-effort embed URL for common providers; otherwise return original (may work as iframe src). */
export function toVideoEmbedUrl(raw: string): string | null {
  const u = raw.trim();
  if (!u) return null;
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'loom.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      const shareIdx = parts.indexOf('share');
      if (shareIdx >= 0 && parts[shareIdx + 1]) {
        return `https://www.loom.com/embed/${parts[shareIdx + 1]}`;
      }
    }
    if (host === 'vimeo.com') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return u;
}
