'use client';

import { createBrowserClient } from '@supabase/ssr';

const MAX_SIZE = 5 * 1024 * 1024;

export async function uploadMemberResumeFile(
  file: File
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!file || file.size > MAX_SIZE) {
    return { ok: false, error: 'File too large (max 5MB)' };
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
    return { ok: false, error: 'Only PDF, DOC, DOCX allowed' };
  }

  const prepare = await fetch('/api/member/resume/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'prepare', fileName: file.name }),
  });
  let prep: { bucket?: string; path?: string; token?: string; error?: string };
  try {
    prep = await prepare.json();
  } catch {
    return { ok: false, error: 'Upload failed (invalid response)' };
  }
  if (!prepare.ok || !prep.bucket || !prep.path || !prep.token) {
    return { ok: false, error: prep.error ?? 'Upload failed' };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, error: 'App configuration error' };
  }

  const supabase = createBrowserClient(url, anon);
  const { error: upErr } = await supabase.storage
    .from(prep.bucket)
    .uploadToSignedUrl(prep.path, prep.token, file, {
      contentType: file.type || 'application/pdf',
    });
  if (upErr) {
    return { ok: false, error: upErr.message || 'Upload failed' };
  }

  const done = await fetch('/api/member/resume/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'complete', path: prep.path }),
  });
  let d: { error?: string };
  try {
    d = await done.json();
  } catch {
    return { ok: false, error: 'Upload failed to finalize' };
  }
  if (!done.ok) {
    return { ok: false, error: d.error ?? 'Failed to save resume' };
  }

  return { ok: true };
}
