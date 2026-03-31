'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import '@/css/counselor.css';

type Props = {
  completeness: number;
  initialHasOriginal: boolean;
  initialHasEnhanced: boolean;
};

const recommendedProfileCompleteness = 50;

/** Upload + AI generate for narrow viewports (desktop uses ResumeClient). */
export default function ResumeMobileResumeTools({
  completeness,
  initialHasOriginal,
  initialHasEnhanced,
}: Props) {
  const router = useRouter();
  const [resumeData, setResumeData] = useState<{
    originalUrl: string | null;
    enhancedUrl: string | null;
    enhancedText: string | null;
    hasOriginal: boolean;
    hasEnhanced: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [dragover, setDragover] = useState(false);

  useEffect(() => {
    fetch('/api/member/resume')
      .then((r) => r.json())
      .then((d) => {
        setResumeData({
          originalUrl: d.originalUrl ?? null,
          enhancedUrl: d.enhancedUrl ?? null,
          enhancedText: d.enhancedText ?? null,
          hasOriginal: d.hasOriginal ?? false,
          hasEnhanced: d.hasEnhanced ?? false,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (file: File) => {
    if (!file || file.size > 5 * 1024 * 1024) {
      setUploadError('File too large (max 5MB)');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
      setUploadError('Only PDF, DOC, DOCX allowed');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/member/resume/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        const refetch = await fetch('/api/member/resume');
        const d = await refetch.json();
        setResumeData({
          originalUrl: d.originalUrl ?? null,
          enhancedUrl: d.enhancedUrl ?? null,
          enhancedText: d.enhancedText ?? null,
          hasOriginal: d.hasOriginal ?? true,
          hasEnhanced: d.hasEnhanced ?? false,
        });
        router.refresh();
      } else {
        setUploadError(data.error ?? 'Upload failed');
      }
    } catch {
      setUploadError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      const res = await fetch('/api/member/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        const refetch = await fetch('/api/member/resume');
        const d = await refetch.json();
        setResumeData({
          originalUrl: d.originalUrl ?? null,
          enhancedUrl: d.enhancedUrl ?? null,
          enhancedText: d.enhancedText ?? data.resume ?? null,
          hasOriginal: d.hasOriginal ?? false,
          hasEnhanced: d.hasEnhanced ?? true,
        });
        router.refresh();
      } else {
        setGenerateError(data.error ?? 'Generation failed');
      }
    } catch {
      setGenerateError('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  if (loading && !resumeData) {
    return (
      <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', margin: 0 }}>Loading resume tools…</p>
      </div>
    );
  }

  const hasOriginal = resumeData?.hasOriginal ?? initialHasOriginal;
  const hasEnhanced = resumeData?.hasEnhanced ?? initialHasEnhanced;

  return (
    <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
      <section style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Upload</h2>
        <div
          className={`counselor-resume-upload ${dragover ? 'dragover' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragover(true);
          }}
          onDragLeave={() => setDragover(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('resume-mobile-file-input')?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              document.getElementById('resume-mobile-file-input')?.click();
            }
          }}
        >
          <input
            id="resume-mobile-file-input"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
            {uploading ? 'Uploading…' : 'Tap to choose a file, or drag and drop'}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            PDF, DOC, DOCX — max 5MB
          </p>
        </div>
        {uploadError && <p style={{ color: '#c00', marginTop: '0.5rem', fontSize: '0.8125rem' }}>{uploadError}</p>}
        {hasOriginal && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
            Original resume on file.
            {resumeData?.originalUrl && (
              <>
                {' '}
                <a href={resumeData.originalUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                  Open file
                </a>
              </>
            )}
          </p>
        )}
      </section>

      <section id="resume-ai-generator" style={{ marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>AI Generator</h2>
        <div style={{ marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem' }}>Profile completeness: {completeness}%</span>
          <div className="counselor-profile-bar">
            <div className="counselor-profile-bar-fill" style={{ width: `${completeness}%` }} />
          </div>
        </div>
        {completeness < recommendedProfileCompleteness && (
          <p style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
            <Link href="/dashboard/profile" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              Complete My Profile
            </Link>{' '}
            for a better resume. You can still generate now.
          </p>
        )}
        <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={generating} style={{ width: '100%' }}>
          {generating ? 'Generating…' : 'Generate Resume'}
        </button>
        {generateError && <p style={{ color: '#c00', marginTop: '0.5rem', fontSize: '0.8125rem' }}>{generateError}</p>}
        {hasEnhanced && resumeData?.enhancedUrl && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem' }}>
            <a href={resumeData.enhancedUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: 'inline-block', width: '100%', textAlign: 'center' }}>
              Download AI-enhanced resume
            </a>
          </p>
        )}
      </section>
    </div>
  );
}
