'use client';

const MAX_SIZE = 5 * 1024 * 1024;

export async function uploadMemberResumeFile(
  file: File
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!file || file.size > MAX_SIZE) {
    return { ok: false, error: 'File too large (max 5MB)' };
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
    return { ok: false, error: 'Only PDF, DOC, DOCX, TXT allowed' };
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/member/resume/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? 'Upload failed' };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'Upload failed (network error)' };
  }
}
