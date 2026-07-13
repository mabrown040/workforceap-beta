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
        <h3 className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-[0.1em]" style={{ color: 'var(--color-on-surface-variant)' }}>Resume</h3>
      </div>

      {hasResume ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '24px' }} aria-hidden="true">description</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="wa-text-sm wa-font-semibold wa-truncate" style={{ color: 'var(--color-on-surface)' }}>
                {fileName}
              </p>
              <p className="wa-text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>Uploaded</p>
            </div>
            <button type="button"
              className="wa-text-xs wa-font-bold"
              style={{ padding: '0.375rem 0.75rem', borderRadius: '9999px', background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', color: 'var(--color-accent)' }}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-busy={uploading}
            >
              <span aria-live="polite">{uploading ? 'Uploading…' : 'Replace'}</span>
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={onFileChange} style={{ display: 'none' }} />
          </div>

          {/* Inline preview toggle */}
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
                background: 'var(--surface-container-lowest)',
                color: 'var(--color-accent)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                cursor: loadingPreview ? 'wait' : 'pointer',
              }}
              aria-busy={loadingPreview}
            >
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.125rem' }}>
                visibility
              </span>
              <span aria-live="polite">{loadingPreview ? 'Loading preview…' : 'View Resume'}</span>
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
          <p className="wa-text-sm wa-font-semibold" style={{ color: 'var(--color-on-surface)' }} aria-live="polite">
            {uploading ? 'Uploading…' : 'Upload Resume'}
          </p>
          <p className="wa-text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>PDF, DOC, or DOCX · Max 5MB</p>
          <input type="file" accept=".pdf,.doc,.docx" onChange={onFileChange} style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }} />
        </label>
      )}

      {error && (
        <p style={{ color: 'var(--color-accent)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{error}</p>
      )}
    </div>
  );
}
