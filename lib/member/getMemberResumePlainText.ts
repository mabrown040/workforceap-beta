import { Buffer } from 'node:buffer';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { extractTextFromResumeBuffer } from '@/lib/resume/extractTextFromResumeBuffer';
import {
  hasSubstantiveResumeText,
  sanitizeResumePlainText,
} from '@/lib/resume/extractionQuality';
import { isResumeObjectPathOwnedByUser } from '@/lib/resume/atomicResumeObjectSwap';

const BUCKET = 'member-resumes';

function extFromPath(path: string): string {
  const base = path.split('/').pop() ?? '';
  const i = base.lastIndexOf('.');
  return i >= 0 ? base.slice(i + 1) : 'txt';
}

/**
 * Best-effort plain text from the member's stored resume.
 * By default prefers enhanced resume (for voice/context consumers).
 * Pass `opts.preferOriginal = true` for generation paths to use the original uploaded resume as source-of-truth.
 */
export async function getMemberResumePlainText(
  userId: string,
  maxChars = 8000,
  opts?: { preferOriginal?: boolean; readOnlyAudit?: boolean }
): Promise<string> {
  if (opts?.readOnlyAudit) return '';
  const profile = await prisma.profile.findUnique({
    where: { userId },
  });
  if (!profile) return '';

  const paths = (opts?.preferOriginal
    ? [profile.resumeOriginalPath, profile.resumeEnhancedPath]
    : [profile.resumeEnhancedPath, profile.resumeOriginalPath]
  ).filter((p): p is string => Boolean(p) && isResumeObjectPathOwnedByUser(userId, p as string));
  if (paths.length === 0) return '';

  const supabase = getSupabaseAdmin();

  for (const path of paths) {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) continue;

    const buf = Buffer.from(await data.arrayBuffer());
    const ext = extFromPath(path);
    try {
      const text = sanitizeResumePlainText(await extractTextFromResumeBuffer(buf, ext));
      if (hasSubstantiveResumeText(text)) {
        return text.slice(0, maxChars);
      }
    } catch (err) {
      console.warn('[getMemberResumePlainText] extract failed', path, err);
    }
  }

  return '';
}
