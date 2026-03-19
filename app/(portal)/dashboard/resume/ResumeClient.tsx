'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import '@/css/counselor.css';

type WitData = {
  name: string;
  email: string;
  phone: string;
  recentEmployer: string;
  targetJob: string;
  skills: string;
};

type ResumeClientProps = {
  completeness: number;
  witData: WitData;
  hasOriginal: boolean;
  hasEnhanced: boolean;
};

export default function ResumeClient({
  completeness,
  witData,
  hasOriginal: initialHasOriginal,
  hasEnhanced: initialHasEnhanced,
}: ResumeClientProps) {
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
    return <p style={{ color: 'var(--color-gray-600)' }}>Loading…</p>;
  }

  const hasOriginal = resumeData?.hasOriginal ?? initialHasOriginal;
  const hasEnhanced = resumeData?.hasEnhanced ?? initialHasEnhanced;

  return (
    <div>
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Upload</h2>
        <div
          className={`counselor-resume-upload ${dragover ? 'dragover' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('resume-file-input')?.click()}
        >
          <input
            id="resume-file-input"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          <p style={{ margin: 0, color: 'var(--color-gray-600)' }}>
            {uploading ? 'Uploading…' : 'Drag and drop your resume here, or click to browse'}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
            PDF, DOC, DOCX — max 5MB
          </p>
        </div>
        {uploadError && <p style={{ color: '#c00', marginTop: '0.5rem' }}>{uploadError}</p>}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>AI Generator</h2>
        <div style={{ marginBottom: '0.5rem' }}>
          <span>Profile completeness: {completeness}%</span>
          <div className="counselor-profile-bar">
            <div className="counselor-profile-bar-fill" style={{ width: `${completeness}%` }} />
          </div>
        </div>
        {completeness < 80 && (
          <p style={{ marginBottom: '0.75rem' }}>
            <Link href="/dashboard/profile" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              Complete My Profile
            </Link>
            {' '}for a better resume.
          </p>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'Generating…' : 'Generate Resume'}
        </button>
        {generateError && <p style={{ color: '#c00', marginTop: '0.5rem' }}>{generateError}</p>}
      </section>

      {(hasOriginal || hasEnhanced) && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Before / After</h2>
          <div className="counselor-resume-preview">
            {hasOriginal && (
              <div className="counselor-resume-card">
                <h3>Original</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
                  <a href={resumeData?.originalUrl ?? '#'} target="_blank" rel="noopener noreferrer">
                    Download Original →
                  </a>
                </p>
              </div>
            )}
            {hasEnhanced && (
              <div className="counselor-resume-card">
                <h3>AI-Enhanced</h3>
                {resumeData?.enhancedText && (
                  <pre>{resumeData.enhancedText.slice(0, 1500)}{resumeData.enhancedText.length > 1500 ? '…' : ''}</pre>
                )}
                <a href={resumeData?.enhancedUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: '0.9rem' }}>
                  Download Enhanced →
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="counselor-wit-guide">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>WorkInTexas Guide</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--color-gray-600)' }}>
          Pre-filled with your data. Use these steps when creating your WorkInTexas profile.
        </p>
        <ol>
          <li><strong>Create account</strong> at workintexas.com</li>
          <li><strong>Contact info</strong> → {witData.name}, {witData.email}, {witData.phone}</li>
          <li><strong>Work history</strong> → {witData.recentEmployer}</li>
          <li><strong>Target job</strong> → {witData.targetJob}</li>
          <li><strong>Upload resume</strong> → Download from above</li>
          <li><strong>Skills</strong> → {witData.skills}</li>
        </ol>
        <a
          href="https://www.workintexas.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
        >
          Open WorkInTexas →
        </a>
      </section>
    </div>
  );
}
