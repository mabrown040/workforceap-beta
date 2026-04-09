'use client';

import { createBrowserClient } from '@supabase/ssr';

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export type MockInterviewVideoMeta = {
  durationMs: number;
  role: string;
  interviewType: string;
  mimeType: string;
};

export async function uploadMockInterviewVideo(
  blob: Blob,
  meta: MockInterviewVideoMeta
): Promise<
  | { ok: true; path: string; playbackUrl: string | null }
  | { ok: false; error: string }
> {
  if (blob.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: `Recording too large (max ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB)` };
  }

  const fileExt = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const prepare = await fetch('/api/member/voice-interview/recording', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'prepare', fileExt }),
  });
  let prep: {
    bucket?: string;
    path?: string;
    token?: string;
    error?: string;
    maxBytes?: number;
  };
  try {
    prep = await prepare.json();
  } catch {
    return { ok: false, error: 'Upload failed (invalid response)' };
  }
  if (!prepare.ok || !prep.bucket || !prep.path || !prep.token) {
    return { ok: false, error: prep.error ?? 'Could not start upload' };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, error: 'App configuration error' };
  }

  const supabase = createBrowserClient(url, anon);
  const contentType = meta.mimeType || blob.type || 'video/webm';
  const buffer = await blob.arrayBuffer();
  const { error: upErr } = await supabase.storage.from(prep.bucket).uploadToSignedUrl(prep.path, prep.token, buffer, {
    contentType,
  });
  if (upErr) {
    return { ok: false, error: upErr.message || 'Upload failed' };
  }

  const done = await fetch('/api/member/voice-interview/recording', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'complete',
      path: prep.path,
      durationMs: meta.durationMs,
      role: meta.role,
      interviewType: meta.interviewType,
      mimeType: contentType,
      byteSize: blob.size,
    }),
  });
  let d: { ok?: boolean; path?: string; playbackUrl?: string | null; error?: string };
  try {
    d = await done.json();
  } catch {
    return { ok: false, error: 'Upload failed to finalize' };
  }
  if (!done.ok || !d.path) {
    return { ok: false, error: d.error ?? 'Failed to save recording' };
  }

  return { ok: true, path: d.path, playbackUrl: d.playbackUrl ?? null };
}
