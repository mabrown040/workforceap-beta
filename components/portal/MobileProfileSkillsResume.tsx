'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { uploadMemberResumeFile } from '@/lib/portal/memberResumeUpload';

export default function MobileProfileSkillsResume({
  resumeOriginalPath,
}: {
  resumeOriginalPath: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [hasResume, setHasResume] = useState(Boolean(resumeOriginalPath));
  const [fileName, setFileName] = useState(resumeOriginalPath?.split('/').pop() ?? 'resume.pdf');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch('/api/member/resume');
      if (res.ok) {
        const data = await res.json();
        if (data.originalUrl) setPreviewUrl(data.originalUrl);
      }
    } catch { /* ignore */ }
    setLoadingPreview(false);
  };

  const handleFile = async (file: File) => {
    setError('');
    setUploading(true);
    const result = await uploadMemberResumeFile(file);
    setUploading(false);
    if (result.ok) {
      setHasResume(true);
      setFileName(file.name);
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div style={{ margin: '0 1.5rem 1rem', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--outline-variant)', background: 'var(--surface-container-low)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>Resume</h3>
      </div>

      {hasResume ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '24px' }} aria-hidden="true">description</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-on-surface)', margin: 0 }}>
                {fileName}
              </p>
              <p style={{ fontSize: '0.625rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>Uploaded</p>
            </div>
            <button
              style={{ padding: '0.375rem 0.75rem', borderRadius: '9999px', background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)', color: 'var(--color-accent)', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Replace'}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={onFileChange} style={{ display: 'none' }} />
          </div>

          {!previewUrl && (
            <button
              type="button"
              onClick={loadPreview}
              disabled={loadingPreview}
              style={{
                marginTop: '0.75rem',
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--outline-variant)',
                background: 'var(--color-surface)',
                color: 'var(--color-accent)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: loadingPreview ? 'wait' : 'pointer',
              }}
            >
              {loadingPreview ? 'Loading preview…' : '👁 View Resume'}
            </button>
          )}

          {previewUrl && (
            <div style={{ marginTop: '0.75rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--outline-variant)' }}>
              <iframe
                src={previewUrl}
                title="Resume preview"
                style={{ width: '100%', height: '500px', border: 'none' }}
              />
            </div>
          )}
        </>
      ) : (
        <label
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem 0', borderRadius: '0.75rem', border: '2px dashed var(--outline-variant)', background: 'var(--surface-container-lowest)', cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.6 : 1 }}
        >
          <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.875rem' }} aria-hidden="true">
            {uploading ? 'hourglass_top' : 'upload_file'}
          </span>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: 0 }}>
            {uploading ? 'Uploading…' : 'Upload Resume'}
          </p>
          <p style={{ fontSize: '0.625rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>PDF, DOC or TXT · Max 5MB</p>
          <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={onFileChange} style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }} />
        </label>
      )}

      {error && (
        <p style={{ color: 'var(--color-accent)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{error}</p>
      )}
    </div>
  );
}
