'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [previewable, setPreviewable] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch('/api/member/resume');
      if (res.ok) {
        const data = await res.json();
        if (data.originalUrl) setPreviewUrl(data.originalUrl);
        setPreviewable(Boolean(data.originalPreviewable));
      }
    } catch { /* ignore */ }
    setLoadingPreview(false);
  };

  useEffect(() => {
    if (hasResume) {
      void loadPreview();
    }
  }, [hasResume]);

  const handleFile = async (file: File) => {
    setError('');
    setUploading(true);
    const result = await uploadMemberResumeFile(file);
    setUploading(false);
    if (result.ok) {
      setHasResume(true);
      setFileName(file.name);
      setPreviewable(file.name.toLowerCase().endsWith('.pdf'));
      router.refresh();
      void loadPreview();
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
    <div style={{ margin: '0 1.5rem 1rem', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(222,191,194,0.3)', background: '#fcf9f8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-[0.1em]" style={{ color: '#584144' }}>Resume</h3>
      </div>

      {hasResume ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#8c0f37', fontSize: '24px' }}>description</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="wa-text-sm wa-font-semibold wa-truncate" style={{ color: '#1c1b1b' }}>
                {fileName}
              </p>
              <p className="wa-text-[10px]" style={{ color: '#584144' }}>Uploaded</p>
            </div>
            <button
              className="wa-text-xs wa-font-bold"
              style={{ padding: '0.375rem 0.75rem', borderRadius: '9999px', background: '#fff1f2', color: '#8c0f37' }}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Replace'}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={onFileChange} style={{ display: 'none' }} />
          </div>

          {loadingPreview && !previewUrl && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#584144' }}>Loading preview…</p>
          )}

          {previewUrl && previewable && (
            <div style={{ marginTop: '0.75rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #debfc2', background: '#fff' }}>
              <object
                data={previewUrl}
                type="application/pdf"
                aria-label="Resume preview"
                style={{ width: '100%', height: '500px', border: 'none' }}
              >
                <iframe
                  src={previewUrl}
                  title="Resume preview"
                  style={{ width: '100%', height: '500px', border: 'none' }}
                />
              </object>
            </div>
          )}

          {previewUrl && !previewable && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #debfc2', background: '#fff' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#584144' }}>
                This resume was uploaded as a document file and may not render inline on mobile.
              </p>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#8c0f37', fontWeight: 700, fontSize: '0.8125rem' }}>
                Open resume →
              </a>
            </div>
          )}
        </>
      ) : (
        <label
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem 0', borderRadius: '0.75rem', border: '2px dashed #debfc2', background: '#f6f3f2', cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.6 : 1 }}
        >
          <span className="material-symbols-outlined" style={{ color: '#ad2c4d', fontSize: '1.875rem' }}>
            {uploading ? 'hourglass_top' : 'upload_file'}
          </span>
          <p className="wa-text-sm wa-font-semibold" style={{ color: '#1c1b1b' }}>
            {uploading ? 'Uploading…' : 'Upload Resume'}
          </p>
          <p className="wa-text-[10px]" style={{ color: '#584144' }}>PDF or DOC · Max 5MB</p>
          <input type="file" accept=".pdf,.doc,.docx" onChange={onFileChange} style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }} />
        </label>
      )}

      {error && (
        <p style={{ color: '#c00', fontSize: '0.75rem', marginTop: '0.5rem' }}>{error}</p>
      )}
    </div>
  );
}
