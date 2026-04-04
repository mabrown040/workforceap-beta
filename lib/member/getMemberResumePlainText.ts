import { Buffer } from 'node:buffer';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { extractTextFromResumeBuffer } from '@/lib/resume/extractTextFromResumeBuffer';

const BUCKET = 'member-resumes';

function extFromPath(path: string): string {
  const base = path.split('/').pop() ?? '';
  const i = base.lastIndexOf('.');
  return i >= 0 ? base.slice(i + 1) : 'txt';
}

/**
 * Best-effort plain text from the member's stored resume (enhanced first, then original).
 * Used for AI voice context and profile hydration — not for download URLs.
 *
 * @param originalOnly When true, only reads `resumeOriginalPath` (e.g. resume generation must
 *   not use prior AI output from `resumeEnhancedPath`).
 */
export async function getMemberResumePlainText(
  userId: string,
  maxChars = 8000,
  originalOnly = false
): Promise<string> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
  });
  if (!profile) return '';

  const paths = (
    originalOnly
      ? [profile.resumeOriginalPath]
      : [profile.resumeEnhancedPath, profile.resumeOriginalPath]
  ).filter((p): p is string => !!p);
  if (paths.length === 0) return '';

  const supabase = getSupabaseAdmin();

  for (const path of paths) {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) continue;

    const buf = Buffer.from(await data.arrayBuffer());
    const ext = extFromPath(path);
    try {
      const text = await extractTextFromResumeBuffer(buf, ext);
      const t = text.trim();
      if (t.length > 40) {
        return t.slice(0, maxChars);
      }
    } catch (err) {
      console.warn('[getMemberResumePlainText] extract failed', path, err);
    }
  }

  return '';
}
